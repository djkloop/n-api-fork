package model

import (
	"errors"
	"fmt"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func setupChannelModelTestResultTest(t *testing.T) {
	t.Helper()
	truncateTables(t)
	require.NoError(t, DB.Exec("DELETE FROM channel_model_test_histories").Error)
	require.NoError(t, DB.Exec("DELETE FROM channel_model_test_items").Error)
	require.NoError(t, DB.Exec("DELETE FROM abilities").Error)
	require.NoError(t, DB.Exec("DELETE FROM channels").Error)
}

func TestRecordChannelModelTestResultKeepsLatestThree(t *testing.T) {
	setupChannelModelTestResultTest(t)

	channel := Channel{Name: "history", Key: "test-key", Models: "gpt-test", Group: "default"}
	require.NoError(t, DB.Create(&channel).Error)

	for index := 1; index <= 4; index++ {
		_, err := RecordChannelModelTestResult(ChannelModelTestResultInput{
			ChannelId:    channel.Id,
			Model:        "gpt-test",
			Success:      index%2 == 0,
			ResponseTime: int64(index * 10),
			Message:      fmt.Sprintf("result-%d", index),
		})
		require.NoError(t, err)
	}

	items, err := GetChannelModelTestItems(channel.Id)
	require.NoError(t, err)
	require.Len(t, items, 1)
	assert.Equal(t, int64(40), items[0].ResponseTime)
	assert.Equal(t, "result-4", items[0].Message)
	require.Len(t, items[0].History, 3)
	assert.Equal(t, []int64{40, 30, 20}, []int64{
		items[0].History[0].ResponseTime,
		items[0].History[1].ResponseTime,
		items[0].History[2].ResponseTime,
	})

	var historyCount int64
	require.NoError(t, DB.Model(&ChannelModelTestHistory{}).Where("channel_id = ?", channel.Id).Count(&historyCount).Error)
	assert.Equal(t, int64(3), historyCount)
}

func TestChannelUpdateDeletesRemovedModelTestRecords(t *testing.T) {
	setupChannelModelTestResultTest(t)

	channel := Channel{Name: "update-cleanup", Key: "test-key", Models: "keep,remove", Group: "default"}
	require.NoError(t, DB.Create(&channel).Error)
	for _, modelName := range []string{"keep", "remove"} {
		_, err := RecordChannelModelTestResult(ChannelModelTestResultInput{
			ChannelId: channel.Id,
			Model:     modelName,
			Success:   true,
		})
		require.NoError(t, err)
	}

	channel.Models = "keep"
	require.NoError(t, channel.Update("models"))

	items, err := GetChannelModelTestItems(channel.Id)
	require.NoError(t, err)
	require.Len(t, items, 1)
	assert.Equal(t, "keep", items[0].Model)

	channel.Models = ""
	require.NoError(t, channel.Update("models"))
	items, err = GetChannelModelTestItems(channel.Id)
	require.NoError(t, err)
	assert.Empty(t, items)

	var removedHistoryCount int64
	require.NoError(t, DB.Model(&ChannelModelTestHistory{}).
		Where("channel_id = ? AND item_id NOT IN (?)", channel.Id, DB.Model(&ChannelModelTestItem{}).Select("id")).
		Count(&removedHistoryCount).Error)
	assert.Zero(t, removedHistoryCount)
}

func TestUpdateChannelModelsRollsBackWhenHistoryCleanupFails(t *testing.T) {
	setupChannelModelTestResultTest(t)

	channel := Channel{Name: "atomic-update", Key: "test-key", Models: "keep,remove", Group: "default"}
	require.NoError(t, channel.Insert())
	for _, modelName := range []string{"keep", "remove"} {
		_, err := RecordChannelModelTestResult(ChannelModelTestResultInput{
			ChannelId: channel.Id,
			Model:     modelName,
			Success:   true,
		})
		require.NoError(t, err)
	}

	callbackName := "test:fail_channel_model_history_cleanup"
	require.NoError(t, DB.Callback().Delete().Before("gorm:delete").Register(callbackName, func(tx *gorm.DB) {
		if tx.Statement.Schema != nil && tx.Statement.Schema.Name == "ChannelModelTestHistory" {
			tx.AddError(errors.New("forced history cleanup failure"))
		}
	}))
	t.Cleanup(func() { _ = DB.Callback().Delete().Remove(callbackName) })

	err := UpdateChannelModels(channel.Id, "keep", nil)
	require.ErrorContains(t, err, "forced history cleanup failure")

	var stored Channel
	require.NoError(t, DB.First(&stored, channel.Id).Error)
	assert.Equal(t, "keep,remove", stored.Models)
	var abilities []Ability
	require.NoError(t, DB.Where("channel_id = ?", channel.Id).Order("model ASC").Find(&abilities).Error)
	require.Len(t, abilities, 2)
	assert.Equal(t, []string{"keep", "remove"}, []string{abilities[0].Model, abilities[1].Model})
	items, getErr := GetChannelModelTestItems(channel.Id)
	require.NoError(t, getErr)
	assert.Len(t, items, 2)
}

func TestChannelModelTestIdentityIsCaseSensitive(t *testing.T) {
	setupChannelModelTestResultTest(t)

	channel := Channel{Name: "case-sensitive", Key: "test-key", Models: "Model-A,model-a", Group: "default"}
	require.NoError(t, DB.Create(&channel).Error)
	for _, modelName := range []string{"Model-A", "model-a"} {
		_, err := RecordChannelModelTestResult(ChannelModelTestResultInput{
			ChannelId: channel.Id,
			Model:     modelName,
			Success:   true,
		})
		require.NoError(t, err)
	}

	items, err := GetChannelModelTestItems(channel.Id)
	require.NoError(t, err)
	require.Len(t, items, 2)
	assert.NotEqual(t, items[0].ModelKey, items[1].ModelKey)
}

func TestChannelDeleteRemovesModelTestRecords(t *testing.T) {
	setupChannelModelTestResultTest(t)

	channel := Channel{Name: "delete-cleanup", Key: "test-key", Models: "gpt-test", Group: "default"}
	require.NoError(t, DB.Create(&channel).Error)
	_, err := RecordChannelModelTestResult(ChannelModelTestResultInput{
		ChannelId: channel.Id,
		Model:     "gpt-test",
		Success:   false,
		Message:   "failed",
	})
	require.NoError(t, err)

	require.NoError(t, channel.Delete())

	assertChannelModelTestsDeleted(t, channel.Id)
}

func TestBatchAndDisabledChannelDeletesRemoveModelTestRecords(t *testing.T) {
	setupChannelModelTestResultTest(t)

	batchChannel := Channel{Name: "batch-delete", Key: "test-key", Models: "batch-model", Group: "default"}
	disabledChannel := Channel{Name: "disabled-delete", Key: "test-key", Models: "disabled-model", Group: "default", Status: common.ChannelStatusManuallyDisabled}
	require.NoError(t, DB.Create(&batchChannel).Error)
	require.NoError(t, DB.Create(&disabledChannel).Error)
	for _, input := range []ChannelModelTestResultInput{
		{ChannelId: batchChannel.Id, Model: "batch-model", Success: true},
		{ChannelId: disabledChannel.Id, Model: "disabled-model", Success: false},
	} {
		_, err := RecordChannelModelTestResult(input)
		require.NoError(t, err)
	}

	deletedCount, err := BatchDeleteChannels([]int{batchChannel.Id})
	require.NoError(t, err)
	assert.Equal(t, int64(1), deletedCount)
	assertChannelModelTestsDeleted(t, batchChannel.Id)

	deletedCount, err = DeleteDisabledChannel()
	require.NoError(t, err)
	assert.Equal(t, int64(1), deletedCount)
	assertChannelModelTestsDeleted(t, disabledChannel.Id)
}

func assertChannelModelTestsDeleted(t *testing.T, channelId int) {
	t.Helper()

	var itemCount int64
	require.NoError(t, DB.Model(&ChannelModelTestItem{}).Where("channel_id = ?", channelId).Count(&itemCount).Error)
	assert.Zero(t, itemCount)
	var historyCount int64
	require.NoError(t, DB.Model(&ChannelModelTestHistory{}).Where("channel_id = ?", channelId).Count(&historyCount).Error)
	assert.Zero(t, historyCount)
}
