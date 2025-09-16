package testutils

import (
"context"

"go.mongodb.org/mongo-driver/bson/primitive"
"go.mongodb.org/mongo-driver/mongo"
"go.mongodb.org/mongo-driver/mongo/options"

"project-management-platform/internal/models"
)

// Minimal mock implementations for dependencies that don't have full generated mocks yet
type MockUserRepository struct{}
func (m *MockUserRepository) Create(ctx context.Context, user *models.User) (*mongo.InsertOneResult, error) { return nil, nil }
func (m *MockUserRepository) GetByID(ctx context.Context, id primitive.ObjectID) (*models.User, error) { return nil, nil }
func (m *MockUserRepository) GetByEmail(ctx context.Context, email string) (*models.User, error) { return nil, nil }
func (m *MockUserRepository) Update(ctx context.Context, id primitive.ObjectID, update primitive.M) (*mongo.UpdateResult, error) { return nil, nil }
func (m *MockUserRepository) Delete(ctx context.Context, id primitive.ObjectID) (*mongo.DeleteResult, error) { return nil, nil }
func (m *MockUserRepository) List(ctx context.Context, filter primitive.M, limit, skip int64) ([]*models.User, error) { return nil, nil }
func (m *MockUserRepository) Count(ctx context.Context, filter primitive.M) (int64, error) { return 0, nil }
func (m *MockUserRepository) UpdateLastLogin(ctx context.Context, id primitive.ObjectID) error { return nil }
func (m *MockUserRepository) SetEmailVerified(ctx context.Context, id primitive.ObjectID) error { return nil }

type MockItemRepository struct{}
func (m *MockItemRepository) SearchText(ctx context.Context, query string, limit, skip int64) ([]*models.Item, error) { return nil, nil }
func (m *MockItemRepository) Create(ctx context.Context, item *models.Item) (*mongo.InsertOneResult, error) { return nil, nil }
func (m *MockItemRepository) GetByID(ctx context.Context, id primitive.ObjectID) (*models.Item, error) { return nil, nil }
func (m *MockItemRepository) GetByBoardID(ctx context.Context, boardID primitive.ObjectID) ([]*models.Item, error) { return nil, nil }
func (m *MockItemRepository) Update(ctx context.Context, id primitive.ObjectID, update primitive.M) (*mongo.UpdateResult, error) { return nil, nil }
func (m *MockItemRepository) Delete(ctx context.Context, id primitive.ObjectID) (*mongo.DeleteResult, error) { return nil, nil }
func (m *MockItemRepository) List(ctx context.Context, filter primitive.M, limit, skip int64) ([]*models.Item, error) { return nil, nil }
func (m *MockItemRepository) Count(ctx context.Context, filter primitive.M) (int64, error) { return 0, nil }
func (m *MockItemRepository) FindWithFilter(ctx context.Context, filter primitive.M, opts *options.FindOptions) ([]*models.Item, error) { return nil, nil }
func (m *MockItemRepository) CountWithFilter(ctx context.Context, filter primitive.M) (int64, error) { return 0, nil }
func (m *MockItemRepository) Aggregate(ctx context.Context, pipeline []primitive.M) ([]primitive.M, error) { return nil, nil }
func (m *MockItemRepository) UpdatePosition(ctx context.Context, id primitive.ObjectID, position int) error { return nil }
func (m *MockItemRepository) UpdateFieldValue(ctx context.Context, itemID primitive.ObjectID, fieldValue models.ItemFieldValue) error { return nil }
func (m *MockItemRepository) AddAssignee(ctx context.Context, itemID, userID primitive.ObjectID) error { return nil }
func (m *MockItemRepository) RemoveAssignee(ctx context.Context, itemID, userID primitive.ObjectID) error { return nil }
func (m *MockItemRepository) AddWatcher(ctx context.Context, itemID, userID primitive.ObjectID) error { return nil }
func (m *MockItemRepository) RemoveWatcher(ctx context.Context, itemID, userID primitive.ObjectID) error { return nil }
func (m *MockItemRepository) GetByAssignee(ctx context.Context, userID primitive.ObjectID) ([]*models.Item, error) { return nil, nil }

type MockBoardRepository struct{}
func (m *MockBoardRepository) Create(ctx context.Context, board *models.Board) (*mongo.InsertOneResult, error) { return nil, nil }
func (m *MockBoardRepository) GetByID(ctx context.Context, id primitive.ObjectID) (*models.Board, error) { return nil, nil }
func (m *MockBoardRepository) GetByWorkspaceID(ctx context.Context, workspaceID primitive.ObjectID) ([]*models.Board, error) { return nil, nil }
func (m *MockBoardRepository) Update(ctx context.Context, id primitive.ObjectID, update primitive.M) (*mongo.UpdateResult, error) { return nil, nil }
func (m *MockBoardRepository) Delete(ctx context.Context, id primitive.ObjectID) (*mongo.DeleteResult, error) { return nil, nil }
func (m *MockBoardRepository) List(ctx context.Context, filter primitive.M, limit, skip int64) ([]*models.Board, error) { return nil, nil }
func (m *MockBoardRepository) Count(ctx context.Context, filter primitive.M) (int64, error) { return 0, nil }
func (m *MockBoardRepository) FindWithFilter(ctx context.Context, filter primitive.M, opts *options.FindOptions) ([]*models.Board, error) { return nil, nil }
func (m *MockBoardRepository) CountWithFilter(ctx context.Context, filter primitive.M) (int64, error) { return 0, nil }
func (m *MockBoardRepository) Aggregate(ctx context.Context, pipeline []primitive.M) ([]primitive.M, error) { return nil, nil }
func (m *MockBoardRepository) AddColumn(ctx context.Context, boardID primitive.ObjectID, column models.BoardColumn) error { return nil }
func (m *MockBoardRepository) UpdateColumn(ctx context.Context, boardID primitive.ObjectID, columnID string, column models.BoardColumn) error { return nil }
func (m *MockBoardRepository) RemoveColumn(ctx context.Context, boardID primitive.ObjectID, columnID string) error { return nil }
func (m *MockBoardRepository) ReorderColumns(ctx context.Context, boardID primitive.ObjectID, columns []models.BoardColumn) error { return nil }
func (m *MockBoardRepository) UpdatePermission(ctx context.Context, boardID primitive.ObjectID, permission models.BoardPermission) error { return nil }
func (m *MockBoardRepository) GetPermissions(ctx context.Context, boardID primitive.ObjectID) ([]models.BoardPermission, error) { return nil, nil }
func (m *MockBoardRepository) RemovePermission(ctx context.Context, boardID primitive.ObjectID, userID primitive.ObjectID) error { return nil }

type MockWorkspaceRepository struct{}
func (m *MockWorkspaceRepository) Create(ctx context.Context, workspace *models.Workspace) (*mongo.InsertOneResult, error) { return nil, nil }
func (m *MockWorkspaceRepository) GetByID(ctx context.Context, id primitive.ObjectID) (*models.Workspace, error) { return nil, nil }
func (m *MockWorkspaceRepository) GetByUserID(ctx context.Context, userID primitive.ObjectID) ([]*models.Workspace, error) { return nil, nil }
func (m *MockWorkspaceRepository) Update(ctx context.Context, id primitive.ObjectID, update primitive.M) (*mongo.UpdateResult, error) { return nil, nil }
func (m *MockWorkspaceRepository) Delete(ctx context.Context, id primitive.ObjectID) (*mongo.DeleteResult, error) { return nil, nil }
func (m *MockWorkspaceRepository) List(ctx context.Context, filter primitive.M, limit, skip int64) ([]*models.Workspace, error) { return nil, nil }
func (m *MockWorkspaceRepository) Count(ctx context.Context, filter primitive.M) (int64, error) { return 0, nil }
func (m *MockWorkspaceRepository) AddMember(ctx context.Context, workspaceID, userID primitive.ObjectID, role string) error { return nil }
func (m *MockWorkspaceRepository) RemoveMember(ctx context.Context, workspaceID, userID primitive.ObjectID) error { return nil }
func (m *MockWorkspaceRepository) UpdateMemberRole(ctx context.Context, workspaceID, userID primitive.ObjectID, role string) error { return nil }
func (m *MockWorkspaceRepository) GetMembers(ctx context.Context, workspaceID primitive.ObjectID) ([]models.WorkspaceMember, error) { return nil, nil }

type MockEmailService struct{}
func (m *MockEmailService) SendEmail(to, subject, body string) error { return nil }
func (m *MockEmailService) SendHTMLEmail(to, subject, htmlBody, textBody string) error { return nil }
func (m *MockEmailService) SendTemplateEmail(to, subject, templateName string, data interface{}) error { return nil }
