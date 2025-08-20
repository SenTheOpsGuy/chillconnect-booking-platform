from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from app.models.user import User, UserRole
from app.models.verification import Assignment, AssignmentType, AssignmentStatus
from typing import Optional, List
import redis
import json
from app.core.config import settings

# Redis client for caching assignment state
redis_client = redis.from_url(settings.REDIS_URL)

def get_available_employees(db: Session) -> List[int]:
    """Get list of active employee IDs"""
    employees = db.query(User).filter(
        User.role == UserRole.EMPLOYEE,
        User.is_active == True,
        User.verification_status == "verified"
    ).all()
    
    return [emp.id for emp in employees]

def get_employee_workload(db: Session, employee_id: int) -> dict:
    """Get current workload for an employee"""
    # Count active assignments
    verification_count = db.query(Assignment).filter(
        Assignment.employee_id == employee_id,
        Assignment.item_type == AssignmentType.VERIFICATION,
        Assignment.status.in_([AssignmentStatus.ASSIGNED, AssignmentStatus.IN_PROGRESS])
    ).count()
    
    booking_count = db.query(Assignment).filter(
        Assignment.employee_id == employee_id,
        Assignment.item_type == AssignmentType.BOOKING,
        Assignment.status.in_([AssignmentStatus.ASSIGNED, AssignmentStatus.IN_PROGRESS])
    ).count()
    
    return {
        "verification_count": verification_count,
        "booking_count": booking_count,
        "total_count": verification_count + booking_count
    }

def get_next_available_employee(db: Session, assignment_type: str) -> Optional[int]:
    """Get next available employee using round-robin with load balancing"""
    available_employees = get_available_employees(db)
    
    if not available_employees:
        return None
    
    # Get or initialize round-robin state from Redis
    redis_key = f"employee_assignment_rr_{assignment_type}"
    last_assigned_str = redis_client.get(redis_key)
    
    if last_assigned_str:
        last_assigned = int(last_assigned_str)
        # Find next employee in the list
        try:
            current_index = available_employees.index(last_assigned)
            next_index = (current_index + 1) % len(available_employees)
        except ValueError:
            # Last assigned employee not in available list anymore
            next_index = 0
    else:
        next_index = 0
    
    # Find employee with lowest workload starting from next_index
    best_employee = None
    lowest_workload = float('inf')
    
    for i in range(len(available_employees)):
        employee_index = (next_index + i) % len(available_employees)
        employee_id = available_employees[employee_index]
        
        workload = get_employee_workload(db, employee_id)
        
        # Prefer employees with lower total workload
        if workload['total_count'] < lowest_workload:
            lowest_workload = workload['total_count']
            best_employee = employee_id
        
        # If we find an employee with very low workload, use them
        if workload['total_count'] <= 2:  # Max 2 active assignments
            best_employee = employee_id
            break
    
    if best_employee:
        # Update round-robin state
        redis_client.set(redis_key, str(best_employee), ex=3600)  # Expire in 1 hour
        return best_employee
    
    return None

def assign_verification_task(db: Session, user_id: int, verification_type: str) -> Optional[int]:
    """Assign verification task to an employee"""
    employee_id = get_next_available_employee(db, "verification")
    
    if employee_id:
        assignment = Assignment(
            item_id=user_id,
            item_type=AssignmentType.VERIFICATION,
            employee_id=employee_id,
            status=AssignmentStatus.ASSIGNED
        )
        db.add(assignment)
        db.commit()
        
        # Log assignment
        print(f"Assigned verification task for user {user_id} to employee {employee_id}")
    
    return employee_id

def assign_booking_monitoring(db: Session, booking_id: int) -> Optional[int]:
    """Assign booking monitoring to an employee"""
    employee_id = get_next_available_employee(db, "booking")
    
    if employee_id:
        assignment = Assignment(
            item_id=booking_id,
            item_type=AssignmentType.BOOKING,
            employee_id=employee_id,
            status=AssignmentStatus.ASSIGNED
        )
        db.add(assignment)
        db.commit()
        
        # Log assignment
        print(f"Assigned booking monitoring for booking {booking_id} to employee {employee_id}")
    
    return employee_id

def get_employee_assignments(db: Session, employee_id: int, assignment_type: Optional[AssignmentType] = None) -> List[dict]:
    """Get all assignments for an employee"""
    query = db.query(Assignment).filter(
        Assignment.employee_id == employee_id,
        Assignment.status.in_([AssignmentStatus.ASSIGNED, AssignmentStatus.IN_PROGRESS])
    )
    
    if assignment_type:
        query = query.filter(Assignment.item_type == assignment_type)
    
    assignments = query.order_by(Assignment.assigned_at.asc()).all()
    
    result = []
    for assignment in assignments:
        assignment_data = {
            "id": assignment.id,
            "item_id": assignment.item_id,
            "item_type": assignment.item_type,
            "status": assignment.status,
            "assigned_at": assignment.assigned_at.isoformat()
        }
        
        # Add item-specific details
        if assignment.item_type == AssignmentType.VERIFICATION:
            user = db.query(User).filter(User.id == assignment.item_id).first()
            if user:
                assignment_data["user_email"] = user.email
                assignment_data["user_role"] = user.role
        elif assignment.item_type == AssignmentType.BOOKING:
            from app.models.booking import Booking
            booking = db.query(Booking).filter(Booking.id == assignment.item_id).first()
            if booking:
                assignment_data["booking_start_time"] = booking.start_time.isoformat()
                assignment_data["booking_status"] = booking.status
        
        result.append(assignment_data)
    
    return result

def complete_assignment(db: Session, assignment_id: int, employee_id: int) -> bool:
    """Mark assignment as completed"""
    assignment = db.query(Assignment).filter(
        Assignment.id == assignment_id,
        Assignment.employee_id == employee_id
    ).first()
    
    if assignment:
        assignment.status = AssignmentStatus.COMPLETED
        assignment.completed_at = func.now()
        db.commit()
        return True
    
    return False

def get_assignment_statistics(db: Session) -> dict:
    """Get assignment statistics for admin dashboard"""
    # Total assignments by type and status
    verification_stats = db.query(
        Assignment.status,
        func.count(Assignment.id).label('count')
    ).filter(
        Assignment.item_type == AssignmentType.VERIFICATION
    ).group_by(Assignment.status).all()
    
    booking_stats = db.query(
        Assignment.status,
        func.count(Assignment.id).label('count')
    ).filter(
        Assignment.item_type == AssignmentType.BOOKING
    ).group_by(Assignment.status).all()
    
    # Employee workload distribution
    employee_workload = db.query(
        Assignment.employee_id,
        func.count(Assignment.id).label('count')
    ).filter(
        Assignment.status.in_([AssignmentStatus.ASSIGNED, AssignmentStatus.IN_PROGRESS])
    ).group_by(Assignment.employee_id).all()
    
    # Average completion time
    avg_completion_time = db.query(
        func.avg(
            func.extract('epoch', Assignment.completed_at - Assignment.assigned_at) / 3600
        ).label('avg_hours')
    ).filter(
        Assignment.status == AssignmentStatus.COMPLETED,
        Assignment.completed_at.isnot(None)
    ).scalar()
    
    return {
        "verification_stats": {status: count for status, count in verification_stats},
        "booking_stats": {status: count for status, count in booking_stats},
        "employee_workload": {emp_id: count for emp_id, count in employee_workload},
        "avg_completion_time_hours": round(avg_completion_time or 0, 2),
        "total_active_assignments": sum(count for _, count in employee_workload)
    }

def reassign_task(db: Session, assignment_id: int, new_employee_id: int, reason: str) -> bool:
    """Reassign a task to a different employee"""
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    
    if not assignment:
        return False
    
    # Check if new employee is available
    new_employee = db.query(User).filter(
        User.id == new_employee_id,
        User.role == UserRole.EMPLOYEE,
        User.is_active == True
    ).first()
    
    if not new_employee:
        return False
    
    old_employee_id = assignment.employee_id
    assignment.employee_id = new_employee_id
    assignment.status = AssignmentStatus.ASSIGNED  # Reset to assigned
    
    db.commit()
    
    print(f"Reassigned task {assignment_id} from employee {old_employee_id} to {new_employee_id}. Reason: {reason}")
    return True