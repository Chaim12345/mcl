package services

import (
	"context"
	"fmt"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"

	"project-management-platform/internal/models"
	"project-management-platform/internal/repository"
)

// WorkspaceService handles workspace business logic
type WorkspaceService struct {
	workspaceRepo repository.WorkspaceRepository
	userRepo      repository.UserRepository
	emailService  EmailService
}

// NewWorkspaceService creates a new workspace service
func NewWorkspaceService(workspaceRepo repository.WorkspaceRepository, userRepo repository.UserRepository, emailService EmailService) *WorkspaceService {
	return &WorkspaceService{
		workspaceRepo: workspaceRepo,
		userRepo:      userRepo,
		emailService:  emailService,
	}
}

// CreateWorkspaceRequest represents a workspace creation request
type CreateWorkspaceRequest struct {
	Name        string `json:"name" validate:"required,min=1,max=100"`
	Description string `json:"description,omitempty" validate:"max=500"`
	Logo        string `json:"logo,omitempty"`
}

// UpdateWorkspaceRequest represents a workspace update request
type UpdateWorkspaceRequest struct {
	Name        *string                   `json:"name,omitempty" validate:"omitempty,min=1,max=100"`
	Description *string                   `json:"description,omitempty" validate:"omitempty,max=500"`
	Logo        *string                   `json:"logo,omitempty"`
	Settings    *models.WorkspaceSettings `json:"settings,omitempty"`
}

// WorkspaceResponse represents a workspace response
type WorkspaceResponse struct {
	ID          string                   `json:"id"`
	Name        string                   `json:"name"`
	Description string                   `json:"description,omitempty"`
	Logo        string                   `json:"logo,omitempty"`
	OwnerID     string                   `json:"ownerId"`
	Members     []models.WorkspaceMember `json:"members"`
	Settings    models.WorkspaceSettings `json:"settings"`
	CreatedAt   time.Time                `json:"createdAt"`
	UpdatedAt   time.Time                `json:"updatedAt"`
}

// Create creates a new workspace
func (s *WorkspaceService) Create(ctx context.Context, userID primitive.ObjectID, req CreateWorkspaceRequest) (*WorkspaceResponse, error) {
	// Validate user exists
	_, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	// Create workspace
	workspace := models.NewWorkspace(req.Name, req.Description, userID)
	if req.Logo != "" {
		workspace.Logo = req.Logo
	}

	result, err := s.workspaceRepo.Create(ctx, workspace)
	if err != nil {
		return nil, fmt.Errorf("failed to create workspace: %w", err)
	}

	// Set the ID from the insert result
	workspace.ID = result.InsertedID.(primitive.ObjectID)

	return s.toWorkspaceResponse(workspace), nil
}

// GetByID retrieves a workspace by ID
func (s *WorkspaceService) GetByID(ctx context.Context, userID, workspaceID primitive.ObjectID) (*WorkspaceResponse, error) {
	workspace, err := s.workspaceRepo.GetByID(ctx, workspaceID)
	if err != nil {
		return nil, fmt.Errorf("failed to get workspace: %w", err)
	}

	// Check if user has access to this workspace
	if !workspace.IsMember(userID) {
		return nil, fmt.Errorf("access denied: user is not a member of this workspace")
	}

	return s.toWorkspaceResponse(workspace), nil
}

// GetByUserID retrieves workspaces where the user is a member
func (s *WorkspaceService) GetByUserID(ctx context.Context, userID primitive.ObjectID) ([]*WorkspaceResponse, error) {
	workspaces, err := s.workspaceRepo.GetByUserID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get workspaces: %w", err)
	}

	responses := make([]*WorkspaceResponse, len(workspaces))
	for i, workspace := range workspaces {
		responses[i] = s.toWorkspaceResponse(workspace)
	}

	return responses, nil
}

// Update updates a workspace
func (s *WorkspaceService) Update(ctx context.Context, userID, workspaceID primitive.ObjectID, req UpdateWorkspaceRequest) (*WorkspaceResponse, error) {
	// Get workspace and check permissions
	workspace, err := s.workspaceRepo.GetByID(ctx, workspaceID)
	if err != nil {
		return nil, fmt.Errorf("failed to get workspace: %w", err)
	}

	// Check if user is admin
	if !workspace.IsAdmin(userID) {
		return nil, fmt.Errorf("access denied: user is not an admin of this workspace")
	}

	// Build update document
	update := bson.M{}

	if req.Name != nil {
		if *req.Name == "" {
			return nil, fmt.Errorf("workspace name cannot be empty")
		}
		update["name"] = *req.Name
	}

	if req.Description != nil {
		update["description"] = *req.Description
	}

	if req.Logo != nil {
		update["logo"] = *req.Logo
	}

	if req.Settings != nil {
		// Validate settings
		if req.Settings.Visibility != "" &&
			req.Settings.Visibility != models.WorkspaceVisibilityPrivate &&
			req.Settings.Visibility != models.WorkspaceVisibilityPublic {
			return nil, fmt.Errorf("invalid workspace visibility: %s", req.Settings.Visibility)
		}
		update["settings"] = *req.Settings
	}

	if len(update) == 0 {
		return nil, fmt.Errorf("no fields to update")
	}

	// Update workspace
	_, err = s.workspaceRepo.Update(ctx, workspaceID, update)
	if err != nil {
		return nil, fmt.Errorf("failed to update workspace: %w", err)
	}

	// Get updated workspace
	updatedWorkspace, err := s.workspaceRepo.GetByID(ctx, workspaceID)
	if err != nil {
		return nil, fmt.Errorf("failed to get updated workspace: %w", err)
	}

	return s.toWorkspaceResponse(updatedWorkspace), nil
}

// Delete deletes a workspace
func (s *WorkspaceService) Delete(ctx context.Context, userID, workspaceID primitive.ObjectID) error {
	// Get workspace and check permissions
	workspace, err := s.workspaceRepo.GetByID(ctx, workspaceID)
	if err != nil {
		return fmt.Errorf("failed to get workspace: %w", err)
	}

	// Only owner can delete workspace
	if workspace.OwnerID != userID {
		return fmt.Errorf("access denied: only workspace owner can delete workspace")
	}

	// Delete workspace
	_, err = s.workspaceRepo.Delete(ctx, workspaceID)
	if err != nil {
		return fmt.Errorf("failed to delete workspace: %w", err)
	}

	return nil
}

// List retrieves workspaces with pagination
func (s *WorkspaceService) List(ctx context.Context, userID primitive.ObjectID, limit, skip int64) ([]*WorkspaceResponse, int64, error) {
	// For now, just return workspaces where user is a member
	// In the future, this could be extended to include public workspaces
	workspaces, err := s.workspaceRepo.GetByUserID(ctx, userID)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get workspaces: %w", err)
	}

	// Apply pagination manually for now
	total := int64(len(workspaces))
	start := skip
	end := skip + limit

	if start >= total {
		return []*WorkspaceResponse{}, total, nil
	}

	if end > total {
		end = total
	}

	paginatedWorkspaces := workspaces[start:end]
	responses := make([]*WorkspaceResponse, len(paginatedWorkspaces))
	for i, workspace := range paginatedWorkspaces {
		responses[i] = s.toWorkspaceResponse(workspace)
	}

	return responses, total, nil
}

// Member management requests and responses
type InviteMemberRequest struct {
	Email string `json:"email" validate:"required,email"`
	Role  string `json:"role" validate:"required,oneof=admin member"`
}

type UpdateMemberRoleRequest struct {
	Role string `json:"role" validate:"required,oneof=admin member"`
}

type MemberResponse struct {
	UserID   string    `json:"userId"`
	Email    string    `json:"email"`
	Name     string    `json:"name"`
	Role     string    `json:"role"`
	JoinedAt time.Time `json:"joinedAt"`
}

// InviteMember invites a user to the workspace
func (s *WorkspaceService) InviteMember(ctx context.Context, userID, workspaceID primitive.ObjectID, req InviteMemberRequest) error {
	// Get workspace and check permissions
	workspace, err := s.workspaceRepo.GetByID(ctx, workspaceID)
	if err != nil {
		return fmt.Errorf("failed to get workspace: %w", err)
	}

	// Check if user is admin
	if !workspace.IsAdmin(userID) {
		return fmt.Errorf("access denied: user is not an admin of this workspace")
	}

	// Validate role
	if req.Role != models.WorkspaceRoleAdmin && req.Role != models.WorkspaceRoleMember {
		return fmt.Errorf("invalid role: %s", req.Role)
	}

	// Check if user exists
	invitedUser, err := s.userRepo.GetByEmail(ctx, req.Email)
	if err != nil {
		return fmt.Errorf("user with email %s not found", req.Email)
	}

	// Check if user is already a member
	if workspace.IsMember(invitedUser.ID) {
		return fmt.Errorf("user is already a member of this workspace")
	}

	// Add member to workspace
	err = s.workspaceRepo.AddMember(ctx, workspaceID, invitedUser.ID, req.Role)
	if err != nil {
		return fmt.Errorf("failed to add member: %w", err)
	}

	// Send invitation email
	inviterUser, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return fmt.Errorf("failed to get inviter user: %w", err)
	}

	inviterName := inviterUser.FirstName + " " + inviterUser.LastName
	if inviterName == " " {
		inviterName = inviterUser.Email
	}

	subject := fmt.Sprintf("You've been invited to join %s", workspace.Name)
	body := fmt.Sprintf("Hi %s,\n\n%s has invited you to join the workspace '%s' as a %s.\n\nYou can access the workspace by logging into your account.\n\nBest regards,\nProject Management Team",
		invitedUser.FirstName, inviterName, workspace.Name, req.Role)

	err = s.emailService.SendEmail(req.Email, subject, body)
	if err != nil {
		// Log error but don't fail the operation
		fmt.Printf("Failed to send invitation email: %v\n", err)
	}

	return nil
}

// RemoveMember removes a member from the workspace
func (s *WorkspaceService) RemoveMember(ctx context.Context, userID, workspaceID, memberUserID primitive.ObjectID) error {
	// Get workspace and check permissions
	workspace, err := s.workspaceRepo.GetByID(ctx, workspaceID)
	if err != nil {
		return fmt.Errorf("failed to get workspace: %w", err)
	}

	// Check if user is admin or removing themselves
	if !workspace.IsAdmin(userID) && userID != memberUserID {
		return fmt.Errorf("access denied: user is not an admin of this workspace")
	}

	// Cannot remove workspace owner
	if workspace.OwnerID == memberUserID {
		return fmt.Errorf("cannot remove workspace owner")
	}

	// Remove member from workspace
	err = s.workspaceRepo.RemoveMember(ctx, workspaceID, memberUserID)
	if err != nil {
		return fmt.Errorf("failed to remove member: %w", err)
	}

	return nil
}

// UpdateMemberRole updates a member's role
func (s *WorkspaceService) UpdateMemberRole(ctx context.Context, userID, workspaceID, memberUserID primitive.ObjectID, req UpdateMemberRoleRequest) error {
	// Get workspace and check permissions
	workspace, err := s.workspaceRepo.GetByID(ctx, workspaceID)
	if err != nil {
		return fmt.Errorf("failed to get workspace: %w", err)
	}

	// Check if user is admin
	if !workspace.IsAdmin(userID) {
		return fmt.Errorf("access denied: user is not an admin of this workspace")
	}

	// Validate role
	if req.Role != models.WorkspaceRoleAdmin && req.Role != models.WorkspaceRoleMember {
		return fmt.Errorf("invalid role: %s", req.Role)
	}

	// Cannot change owner's role
	if workspace.OwnerID == memberUserID {
		return fmt.Errorf("cannot change workspace owner's role")
	}

	// Update member role
	err = s.workspaceRepo.UpdateMemberRole(ctx, workspaceID, memberUserID, req.Role)
	if err != nil {
		return fmt.Errorf("failed to update member role: %w", err)
	}

	return nil
}

// GetMembers retrieves all members of a workspace with user details
func (s *WorkspaceService) GetMembers(ctx context.Context, userID, workspaceID primitive.ObjectID) ([]*MemberResponse, error) {
	// Get workspace and check permissions
	workspace, err := s.workspaceRepo.GetByID(ctx, workspaceID)
	if err != nil {
		return nil, fmt.Errorf("failed to get workspace: %w", err)
	}

	// Check if user has access to this workspace
	if !workspace.IsMember(userID) {
		return nil, fmt.Errorf("access denied: user is not a member of this workspace")
	}

	// Get member details
	var members []*MemberResponse
	for _, member := range workspace.Members {
		user, err := s.userRepo.GetByID(ctx, member.UserID)
		if err != nil {
			// Skip members whose user records are not found
			continue
		}

		name := user.FirstName + " " + user.LastName
		if name == " " {
			name = user.Email
		}

		members = append(members, &MemberResponse{
			UserID:   member.UserID.Hex(),
			Email:    user.Email,
			Name:     name,
			Role:     member.Role,
			JoinedAt: member.JoinedAt,
		})
	}

	return members, nil
}

// LeaveWorkspace allows a user to leave a workspace
func (s *WorkspaceService) LeaveWorkspace(ctx context.Context, userID, workspaceID primitive.ObjectID) error {
	// Get workspace
	workspace, err := s.workspaceRepo.GetByID(ctx, workspaceID)
	if err != nil {
		return fmt.Errorf("failed to get workspace: %w", err)
	}

	// Cannot leave if user is the owner
	if workspace.OwnerID == userID {
		return fmt.Errorf("workspace owner cannot leave workspace. Transfer ownership or delete the workspace instead")
	}

	// Check if user is a member
	if !workspace.IsMember(userID) {
		return fmt.Errorf("user is not a member of this workspace")
	}

	// Remove user from workspace
	err = s.workspaceRepo.RemoveMember(ctx, workspaceID, userID)
	if err != nil {
		return fmt.Errorf("failed to leave workspace: %w", err)
	}

	return nil
}

// toWorkspaceResponse converts a workspace model to response
func (s *WorkspaceService) toWorkspaceResponse(workspace *models.Workspace) *WorkspaceResponse {
	return &WorkspaceResponse{
		ID:          workspace.ID.Hex(),
		Name:        workspace.Name,
		Description: workspace.Description,
		Logo:        workspace.Logo,
		OwnerID:     workspace.OwnerID.Hex(),
		Members:     workspace.Members,
		Settings:    workspace.Settings,
		CreatedAt:   workspace.CreatedAt,
		UpdatedAt:   workspace.UpdatedAt,
	}
}

// WorkspaceServiceInterface defines the contract for workspace services
type WorkspaceServiceInterface interface {
	Create(ctx context.Context, userID primitive.ObjectID, req CreateWorkspaceRequest) (*WorkspaceResponse, error)
	GetByID(ctx context.Context, userID, workspaceID primitive.ObjectID) (*WorkspaceResponse, error)
	GetByUserID(ctx context.Context, userID primitive.ObjectID) ([]*WorkspaceResponse, error)
	Update(ctx context.Context, userID, workspaceID primitive.ObjectID, req UpdateWorkspaceRequest) (*WorkspaceResponse, error)
	Delete(ctx context.Context, userID, workspaceID primitive.ObjectID) error
	List(ctx context.Context, userID primitive.ObjectID, limit, skip int64) ([]*WorkspaceResponse, int64, error)
	InviteMember(ctx context.Context, userID, workspaceID primitive.ObjectID, req InviteMemberRequest) error
	RemoveMember(ctx context.Context, userID, workspaceID, memberUserID primitive.ObjectID) error
	UpdateMemberRole(ctx context.Context, userID, workspaceID, memberUserID primitive.ObjectID, req UpdateMemberRoleRequest) error
	GetMembers(ctx context.Context, userID, workspaceID primitive.ObjectID) ([]*MemberResponse, error)
	LeaveWorkspace(ctx context.Context, userID, workspaceID primitive.ObjectID) error
}
