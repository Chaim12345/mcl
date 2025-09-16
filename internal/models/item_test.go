package models

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func TestItemFieldValueManagement(t *testing.T) {
	userID := primitive.NewObjectID()
	boardID := primitive.NewObjectID()
	item := NewItem("TestItem", boardID, userID)

	// Initially no field values
	_, exists := item.GetFieldValue("col1")
	assert.False(t, exists)

	// Add new field value
	err := item.SetFieldValue("col1", "value1", userID)
	assert.NoError(t, err)
	val, exists := item.GetFieldValue("col1")
	assert.True(t, exists)
	assert.Equal(t, "value1", val)
	assert.Equal(t, 1, len(item.FieldValues), "should have one field value")

	// Update existing field value
	err = item.SetFieldValue("col1", "value2", userID)
	assert.NoError(t, err)
	val, exists = item.GetFieldValue("col1")
	assert.True(t, exists)
	assert.Equal(t, "value2", val)
	assert.Equal(t, 1, len(item.FieldValues), "should still have one field value")

	// Add another field
	err = item.SetFieldValue("col2", 123, userID)
	assert.NoError(t, err)
	val, exists = item.GetFieldValue("col2")
	assert.True(t, exists)
	assert.Equal(t, 123, val)
	assert.Equal(t, 2, len(item.FieldValues), "should have two field values")

	// Remove field value
	err = item.RemoveFieldValue("col1")
	assert.NoError(t, err)
	_, exists = item.GetFieldValue("col1")
	assert.False(t, exists)
	assert.Equal(t, 1, len(item.FieldValues), "should have one field after removal")

	// Remove non-existent
	err = item.RemoveFieldValue("col3")
	assert.Error(t, err)
}
