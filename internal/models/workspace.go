package models

import (
	"fmt"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Workspace represents a workspace document in MongoDB
type Workspace struct {
	ID          primitive.ObjectID  `bson:"_id,omitempty" json:"id"`
	Name        string              `bson:"name" json:"name"`
	Description string              `bson:"description,omitempty" json:"description,omitempty"`
	Logo        string              `bson:"logo,omitempty" json:"logo,omitempty"`
	OwnerID     primitive.ObjectID  `bson:"ownerId" json:"ownerId"`
	Members     []WorkspaceMember   `bson:"members" json:"members"`
	Settings    WorkspaceSettings   `bson:"settings" json:"settings"`
	CreatedAt   time.Time           `bson:"createdAt" json:"createdAt"`
	UpdatedAt   time.Time           `bson:"updatedAt" json:"updatedAt"`
}

// WorkspaceMember represents a member of a workspace
type WorkspaceMember struct {
	UserID   primitive.ObjectID `bson:"userId" json:"userId"`
	Role     string             `bson:"role" json:"role"` // 'admin', 'member'
	JoinedAt time.Time          `bson:"joinedAt" json:"joinedAt"`
}

// WorkspaceSettings holds workspace configuration
type WorkspaceSettings struct {
	Visibility   string `bson:"visibility" json:"visibility"` // 'private', 'public'
	AllowInvites bool   `bson:"allowInvites" json:"allowInvites"`
}

// WorkspaceRole constants
const (
	WorkspaceRoleAdmin  = "admin"
	WorkspaceRoleMember = "member"
)

// WorkspaceVisibility constants
const (
	WorkspaceVisibilityPrivate = "private"
	WorkspaceVisibilityPublic  = "public"
)

// NewWorkspace creates a new workspace with default values
func NewWorkspace(name, description string, ownerID primitive.ObjectID) *Workspace {
	now := time.Now()
	return &Workspace{
		ID:          primitive.NewObjectID(),
		Name:        name,
		Description: description,
		OwnerID:     ownerID,
		Members: []WorkspaceMember{
			{
				UserID:   ownerID,
				Role:     WorkspaceRoleAdmin,
				JoinedAt: now,
			},
		},
		Settings: WorkspaceSettings{
			Visibility:   WorkspaceVisibilityPrivate,
			AllowInvites: true,
		},
		CreatedAt: now,
		UpdatedAt: now,
	}
}

// Validate validates the workspace data
func (w *Workspace) Validate() error {
	if w.Name == "" {
		return fmt.Errorf("workspace name is required")
	}

	if len(w.Name) > 100 {
		return fmt.Errorf("workspace name must be less than 100 characters")
	}

	if len(w.Description) > 500 {
		return fmt.Errorf("workspace description must be less than 500 characters")
	}

	if w.OwnerID.IsZero() {
		return fmt.Errorf("workspace owner ID is required")
	}

	// Validate settings
	if w.Settings.Visibility != WorkspaceVisibilityPrivate && w.Settings.Visibility != WorkspaceVisibilityPublic {
		return fmt.Errorf("invalid workspace visibility: %s", w.Settings.Visibility)
	}

	// Validate members
	for i, member := range w.Members {
		if member.UserID.IsZero() {
			return fmt.Errorf("member %d: user ID is required", i)
		}

		if member.Role != WorkspaceRoleAdmin && member.Role != WorkspaceRoleMember {
			return fmt.Errorf("member %d: invalid role: %s", i, member.Role)
		}
	}

	return nil
}

// ValidateForUpdate validates workspace data for update operations
func (w *Workspace) ValidateForUpdate() error {
	if w.Name != "" && len(w.Name) > 100 {
		return fmt.Errorf("workspace name must be less than 100 characters")
	}

	if len(w.Description) > 500 {
		return fmt.Errorf("workspace description must be less than 500 characters")
	}

	if w.Settings.Visibility != "" && w.Settings.Visibility != WorkspaceVisibilityPrivate && w.Settings.Visibility != WorkspaceVisibilityPublic {
		return fmt.Errorf("invalid workspace visibility: %s", w.Settings.Visibility)
	}

	return nil
}

// ToBSON converts the workspace to BSON for MongoDB operations
func (w *Workspace) ToBSON() (bson.M, error) {
	data, err := bson.Marshal(w)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal workspace to BSON: %w", err)
	}

	var bsonDoc bson.M
	err = bson.Unmarshal(data, &bsonDoc)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal workspace BSON: %w", err)
	}

	return bsonDoc, nil
}

// FromBSON populates the workspace from BSON data
func (w *Workspace) FromBSON(data bson.M) error {
	bsonData, err := bson.Marshal(data)
	if err != nil {
		return fmt.Errorf("failed to marshal BSON data: %w", err)
	}

	err = bson.Unmarshal(bsonData, w)
	if err != nil {
		return fmt.Errorf("failed to unmarshal BSON to workspace: %w", err)
	}

	return nil
}

// AddMember adds a new member to the workspace
func (w *Workspace) AddMember(userID primitive.ObjectID, role string) error {
	if userID.IsZero() {
		return fmt.Errorf("user ID is required")
	}

	if role != WorkspaceRoleAdmin && role != WorkspaceRoleMember {
		return fmt.Errorf("invalid role: %s", role)
	}

	// Check if user is already a member
	for _, member := range w.Members {
		if member.UserID == userID {
			return fmt.Errorf("user is already a member of this workspace")
		}
	}

	w.Members = append(w.Members, WorkspaceMember{
		UserID:   userID,
		Role:     role,
		JoinedAt: time.Now(),
	})

	w.UpdatedAt = time.Now()
	return nil
}

// RemoveMember removes a member from the workspace
func (w *Workspace) RemoveMember(userID primitive.ObjectID) error {
	if userID.IsZero() {
		return fmt.Errorf("user ID is required")
	}

	// Cannot remove the owner
	if userID == w.OwnerID {
		return fmt.Errorf("cannot remove workspace owner")
	}

	for i, member := range w.Members {
		if member.UserID == userID {
			w.Members = append(w.Members[:i], w.Members[i+1:]...)
			w.UpdatedAt = time.Now()
			return nil
		}
	}

	return fmt.Errorf("user is not a member of this workspace")
}

// UpdateMemberRole updates a member's role
func (w *Workspace) UpdateMemberRole(userID primitive.ObjectID, newRole string) error {
	if userID.IsZero() {
		return fmt.Errorf("user ID is required")
	}

	if newRole != WorkspaceRoleAdmin && newRole != WorkspaceRoleMember {
		return fmt.Errorf("invalid role: %s", newRole)
	}

	// Cannot change owner's role
	if userID == w.OwnerID {
		return fmt.Errorf("cannot change workspace owner's role")
	}

	for i, member := range w.Members {
		if member.UserID == userID {
			w.Members[i].Role = newRole
			w.UpdatedAt = time.Now()
			return nil
		}
	}

	return fmt.Errorf("user is not a member of this workspace")
}

// GetMember returns a member by user ID
func (w *Workspace) GetMember(userID primitive.ObjectID) (*WorkspaceMember, error) {
	for _, member := range w.Members {
		if member.UserID == userID {
			return &member, nil
		}
	}
	return nil, fmt.Errorf("user is not a member of this workspace")
}

// IsMember checks if a user is a member of the workspace
func (w *Workspace) IsMember(userID primitive.ObjectID) bool {
	for _, member := range w.Members {
		if member.UserID == userID {
			return true
		}
	}
	return false
}

// IsAdmin checks if a user is an admin of the workspace
func (w *Workspace) IsAdmin(userID primitive.ObjectID) bool {
	if userID == w.OwnerID {
		return true
	}

	for _, member := range w.Members {
		if member.UserID == userID && member.Role == WorkspaceRoleAdmin {
			return true
		}
	}
	return false
}

// GetMemberCount returns the total number of members
func (w *Workspace) GetMemberCount() int {
	return len(w.Members)
}