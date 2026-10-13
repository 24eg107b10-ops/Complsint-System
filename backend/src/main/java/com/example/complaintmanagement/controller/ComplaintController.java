package com.example.complaintmanagement.controller;

import com.example.complaintmanagement.entity.Complaint;
import com.example.complaintmanagement.repository.ComplaintRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
public class ComplaintController {

    private final ComplaintRepository complaintRepository;

    public ComplaintController(ComplaintRepository complaintRepository) {
        this.complaintRepository = complaintRepository;
    }

    /**
     * Health check endpoint confirming that the backend web service is up and running.
     */
    @GetMapping("/api/health")
    public ResponseEntity<Map<String, String>> healthCheck() {
        Map<String, String> response = new HashMap<>();
        response.put("status", "UP");
        response.put("service", "Online Complaint Management System");
        return ResponseEntity.ok(response);
    }

    /**
     * Retrieve all submitted complaints.
     */
    @GetMapping("/api/complaints")
    public ResponseEntity<List<Complaint>> getAllComplaints() {
        List<Complaint> complaints = complaintRepository.findAll();
        return ResponseEntity.ok(complaints);
    }

    /**
     * Submit a new complaint.
     * Enforces status as PENDING and ignores any client-supplied ID.
     */
    @PostMapping("/api/complaints")
    public ResponseEntity<Complaint> submitComplaint(@Valid @RequestBody Complaint complaint) {
        // Enforce backend-controlled ID and status
        complaint.setId(null);
        complaint.setStatus("PENDING");

        Complaint savedComplaint = complaintRepository.save(complaint);
        return new ResponseEntity<>(savedComplaint, HttpStatus.CREATED);
    }

    /**
     * Mark an existing complaint as RESOLVED.
     */
    @PatchMapping("/api/complaints/{id}/resolve")
    public ResponseEntity<?> resolveComplaint(@PathVariable Long id) {
        var complaintOptional = complaintRepository.findById(id);
        if (complaintOptional.isPresent()) {
            Complaint complaint = complaintOptional.get();
            complaint.setStatus("RESOLVED");
            Complaint updatedComplaint = complaintRepository.save(complaint);
            return ResponseEntity.ok(updatedComplaint);
        } else {
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", "Complaint with ID " + id + " not found");
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorResponse);
        }
    }

    /**
     * Format validation errors into clear JSON messages for the frontend.
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidationExceptions(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(error ->
                errors.put(error.getField(), error.getDefaultMessage())
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errors);
    }
}
