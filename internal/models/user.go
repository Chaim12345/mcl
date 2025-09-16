package models

import (
	"fmt"
	"regexp"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// User represents a user document in MongoDB
type User struct {
	ID            primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Email         string             `bson:"email" json:"email"`
	Password      string             `bson:"password" json:"-"` // Never include in JSON responses
	FirstName     string             `bson:"firstName" json:"firstName"`
	LastName      string             `bson:"lastName" json:"lastName"`
	Avatar        string             `bson:"avatar,omitempty" json:"avatar,omitempty"`
	EmailVerified bool               `bson:"emailVerified" json:"emailVerified"`
	CreatedAt     time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt     time.Time          `bson:"updatedAt" json:"updatedAt"`
	LastLoginAt   *time.Time         `bson:"lastLoginAt,omitempty" json:"lastLoginAt,omitempty"`
	Preferences   UserPreferences    `bson:"preferences" json:"preferences"`
}

// UserPreferences holds user preference settings
type UserPreferences struct {
	Theme         string                    `bson:"theme" json:"theme"`
	Notifications UserNotificationSettings `bson:"notifications" json:"notifications"`
}

// UserNotificationSettings holds notification preferences
type UserNotificationSettings struct {
	Email       bool `bson:"email" json:"email"`
	Push        bool `bson:"push" json:"push"`
	Mentions    bool `bson:"mentions" json:"mentions"`
	Comments    bool `bson:"comments" json:"comments"`
	Assignments bool `bson:"assignments" json:"assignments"`
	Updates     bool `bson:"updates" json:"updates"`
}

// NotificationPreferences is an alias for UserNotificationSettings for service compatibility
type NotificationPreferences = UserNotificationSettings

// NewUser creates a new user with default values
func NewUser(email, password, firstName, lastName string) *User {
	now := time.Now()
	return &User{
		ID:            primitive.NewObjectID(),
		Email:         email,
		Password:      password,
		FirstName:     firstName,
		LastName:      lastName,
		EmailVerified: false,
		CreatedAt:     now,
		UpdatedAt:     now,
		Preferences: UserPreferences{
			Theme: "light",
			Notifications: UserNotificationSettings{
				Email:       true,
				Push:        true,
				Mentions:    true,
				Comments:    true,
				Assignments: true,
				Updates:     false,
			},
		},
	}
}

// Validate validates the user data
func (u *User) Validate() error {
	if u.Email == "" {
		return fmt.Errorf("email is required")
	}

	if !isValidEmail(u.Email) {
		return fmt.Errorf("invalid email format")
	}

	if u.Password == "" {
		return fmt.Errorf("password is required")
	}

	if len(u.Password) < 8 {
		return fmt.Errorf("password must be at least 8 characters long")
	}

	if u.FirstName == "" {
		return fmt.Errorf("first name is required")
	}

	if u.LastName == "" {
		return fmt.Errorf("last name is required")
	}

	if len(u.FirstName) > 50 {
		return fmt.Errorf("first name must be less than 50 characters")
	}

	if len(u.LastName) > 50 {
		return fmt.Errorf("last name must be less than 50 characters")
	}

	return nil
}

// ValidateForUpdate validates user data for update operations
func (u *User) ValidateForUpdate() error {
	if u.Email != "" && !isValidEmail(u.Email) {
		return fmt.Errorf("invalid email format")
	}

	if u.Password != "" && len(u.Password) < 8 {
		return fmt.Errorf("password must be at least 8 characters long")
	}

	if u.FirstName != "" && len(u.FirstName) > 50 {
		return fmt.Errorf("first name must be less than 50 characters")
	}

	if u.LastName != "" && len(u.LastName) > 50 {
		return fmt.Errorf("last name must be less than 50 characters")
	}

	return nil
}

// ToBSON converts the user to BSON for MongoDB operations
func (u *User) ToBSON() (bson.M, error) {
	data, err := bson.Marshal(u)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal user to BSON: %w", err)
	}

	var bsonDoc bson.M
	err = bson.Unmarshal(data, &bsonDoc)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal user BSON: %w", err)
	}

	return bsonDoc, nil
}

// FromBSON populates the user from BSON data
func (u *User) FromBSON(data bson.M) error {
	bsonData, err := bson.Marshal(data)
	if err != nil {
		return fmt.Errorf("failed to marshal BSON data: %w", err)
	}

	err = bson.Unmarshal(bsonData, u)
	if err != nil {
		return fmt.Errorf("failed to unmarshal BSON to user: %w", err)
	}

	return nil
}

// GetFullName returns the user's full name
func (u *User) GetFullName() string {
	return u.FirstName + " " + u.LastName
}

// UpdateLastLogin updates the last login timestamp
func (u *User) UpdateLastLogin() {
	now := time.Now()
	u.LastLoginAt = &now
	u.UpdatedAt = now
}

// SetEmailVerified marks the user's email as verified
func (u *User) SetEmailVerified() {
	u.EmailVerified = true
	u.UpdatedAt = time.Now()
}

// UpdatePreferences updates user preferences
func (u *User) UpdatePreferences(prefs UserPreferences) {
	u.Preferences = prefs
	u.UpdatedAt = time.Now()
}

// isValidEmail validates email format using regex
func isValidEmail(email string) bool {
	emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
	return emailRegex.MatchString(email)
}