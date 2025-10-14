package routes

import (
	"fmt"
	"strings"

	"github.com/go-playground/validator/v10"
)

// Package-level validator instance
var validate *validator.Validate

// Initialize validator in init function
func init() {
	validate = validator.New()
}

// ValidateStruct validates a struct using go-playground/validator
func ValidateStruct(s interface{}) error {
	if err := validate.Struct(s); err != nil {
		if validationErrors, ok := err.(validator.ValidationErrors); ok {
			return formatValidationErrors(validationErrors)
		}
		return err
	}
	return nil
}

// formatValidationErrors converts validation errors into user-friendly messages
func formatValidationErrors(errors validator.ValidationErrors) error {
	var messages []string
	
	for _, err := range errors {
		var message string
		
		switch err.Tag() {
		case "required":
			message = fmt.Sprintf("%s is required", err.Field())
		case "min":
			message = fmt.Sprintf("%s must be at least %s characters", err.Field(), err.Param())
		case "max":
			message = fmt.Sprintf("%s must be at most %s characters", err.Field(), err.Param())
		case "email":
			message = fmt.Sprintf("%s must be a valid email address", err.Field())
		case "uuid":
			message = fmt.Sprintf("%s must be a valid UUID", err.Field())
		case "oneof":
			message = fmt.Sprintf("%s must be one of: %s", err.Field(), err.Param())
		default:
			message = fmt.Sprintf("%s is invalid", err.Field())
		}
		
		messages = append(messages, message)
	}
	
	return fmt.Errorf("validation failed: %s", strings.Join(messages, ", "))
}