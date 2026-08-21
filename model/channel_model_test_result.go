package model

import (
	"crypto/sha256"
	"errors"
	"fmt"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"gorm.io/gorm"
)

const channelModelTestHistoryLimit = 3

type ChannelModelTestItem struct {
	Id           int64                     `json:"id"`
	ChannelId    int                       `json:"channel_id" gorm:"uniqueIndex:idx_channel_model_test_item,priority:1;index"`
	ModelKey     string                    `json:"-" gorm:"type:char(64);not null;uniqueIndex:idx_channel_model_test_item,priority:2"`
	Model        string                    `json:"model" gorm:"type:varchar(255);not null"`
	Success      bool                      `json:"success"`
	ResponseTime int64                     `json:"response_time" gorm:"bigint"`
	TestedAt     int64                     `json:"tested_at" gorm:"bigint"`
	Message      string                    `json:"message" gorm:"type:text"`
	ErrorCode    string                    `json:"error_code" gorm:"type:varchar(255)"`
	History      []ChannelModelTestHistory `json:"history" gorm:"-"`
}

type ChannelModelTestHistory struct {
	Id           int64  `json:"id"`
	ItemId       int64  `json:"item_id" gorm:"index"`
	ChannelId    int    `json:"channel_id" gorm:"index"`
	Success      bool   `json:"success"`
	ResponseTime int64  `json:"response_time" gorm:"bigint"`
	TestedAt     int64  `json:"tested_at" gorm:"bigint"`
	Message      string `json:"message" gorm:"type:text"`
	ErrorCode    string `json:"error_code" gorm:"type:varchar(255)"`
}

type ChannelModelTestResultInput struct {
	ChannelId    int
	Model        string
	Success      bool
	ResponseTime int64
	Message      string
	ErrorCode    string
}

func (channel *Channel) HasModel(modelName string) bool {
	modelName = strings.TrimSpace(modelName)
	if modelName == "" {
		return false
	}
	for _, configuredModel := range channel.GetModels() {
		if strings.TrimSpace(configuredModel) == modelName {
			return true
		}
	}
	return false
}

func channelModelTestKey(modelName string) string {
	return fmt.Sprintf("%x", sha256.Sum256([]byte(modelName)))
}

// RecordChannelModelTestResult updates the model's current test state and keeps
// exactly the three newest history rows. Tests for models not configured on the
// channel are intentionally not persisted because they have no table item.
func RecordChannelModelTestResult(input ChannelModelTestResultInput) (*ChannelModelTestItem, error) {
	input.Model = strings.TrimSpace(input.Model)
	if input.ChannelId == 0 || input.Model == "" {
		return nil, errors.New("channel ID and model are required")
	}

	modelKey := channelModelTestKey(input.Model)
	var item ChannelModelTestItem
	err := DB.Transaction(func(tx *gorm.DB) error {
		var channel Channel
		if err := lockForUpdate(tx).
			Select("id", "models").
			Where("id = ?", input.ChannelId).
			First(&channel).Error; err != nil {
			return err
		}
		if !channel.HasModel(input.Model) {
			return nil
		}

		testedAt := common.GetTimestamp()
		err := tx.Where("channel_id = ? AND model_key = ?", input.ChannelId, modelKey).
			First(&item).Error
		switch {
		case errors.Is(err, gorm.ErrRecordNotFound):
			item = ChannelModelTestItem{
				ChannelId:    input.ChannelId,
				ModelKey:     modelKey,
				Model:        input.Model,
				Success:      input.Success,
				ResponseTime: input.ResponseTime,
				TestedAt:     testedAt,
				Message:      input.Message,
				ErrorCode:    input.ErrorCode,
			}
			if err := tx.Create(&item).Error; err != nil {
				return err
			}
		case err != nil:
			return err
		default:
			if err := tx.Model(&item).Updates(map[string]any{
				"success":       input.Success,
				"response_time": input.ResponseTime,
				"tested_at":     testedAt,
				"message":       input.Message,
				"error_code":    input.ErrorCode,
			}).Error; err != nil {
				return err
			}
			item.Success = input.Success
			item.ResponseTime = input.ResponseTime
			item.TestedAt = testedAt
			item.Message = input.Message
			item.ErrorCode = input.ErrorCode
		}

		history := ChannelModelTestHistory{
			ItemId:       item.Id,
			ChannelId:    input.ChannelId,
			Success:      input.Success,
			ResponseTime: input.ResponseTime,
			TestedAt:     testedAt,
			Message:      input.Message,
			ErrorCode:    input.ErrorCode,
		}
		if err := tx.Create(&history).Error; err != nil {
			return err
		}

		var historyIds []int64
		if err := tx.Model(&ChannelModelTestHistory{}).
			Where("item_id = ?", item.Id).
			Order("tested_at DESC").
			Order("id DESC").
			Pluck("id", &historyIds).Error; err != nil {
			return err
		}
		if len(historyIds) > channelModelTestHistoryLimit {
			if err := tx.Where("id IN ?", historyIds[channelModelTestHistoryLimit:]).
				Delete(&ChannelModelTestHistory{}).Error; err != nil {
				return err
			}
		}

		item.History = make([]ChannelModelTestHistory, 0, channelModelTestHistoryLimit)
		return tx.Where("item_id = ?", item.Id).
			Order("tested_at DESC").
			Order("id DESC").
			Limit(channelModelTestHistoryLimit).
			Find(&item.History).Error
	})
	if err != nil {
		return nil, err
	}
	if item.Id == 0 {
		return nil, nil
	}
	return &item, nil
}

func GetChannelModelTestItems(channelId int) ([]ChannelModelTestItem, error) {
	items := make([]ChannelModelTestItem, 0)
	if err := DB.Where("channel_id = ?", channelId).Order("model ASC").Find(&items).Error; err != nil {
		return nil, err
	}
	if len(items) == 0 {
		return items, nil
	}

	itemIndexes := make(map[int64]int, len(items))
	itemIds := make([]int64, 0, len(items))
	for index := range items {
		items[index].History = make([]ChannelModelTestHistory, 0, channelModelTestHistoryLimit)
		itemIndexes[items[index].Id] = index
		itemIds = append(itemIds, items[index].Id)
	}

	var histories []ChannelModelTestHistory
	if err := DB.Where("item_id IN ?", itemIds).
		Order("tested_at DESC").
		Order("id DESC").
		Find(&histories).Error; err != nil {
		return nil, err
	}
	for _, history := range histories {
		index, ok := itemIndexes[history.ItemId]
		if !ok || len(items[index].History) >= channelModelTestHistoryLimit {
			continue
		}
		items[index].History = append(items[index].History, history)
	}
	return items, nil
}

func DeleteChannelModelTestsNotIn(channelId int, models string) error {
	return DB.Transaction(func(tx *gorm.DB) error {
		return deleteChannelModelTestsNotIn(tx, channelId, models)
	})
}

func deleteChannelModelTestsNotIn(tx *gorm.DB, channelId int, models string) error {
	configuredModels := normalizeChannelModelNames(models)
	configuredModelKeys := make([]string, 0, len(configuredModels))
	for _, modelName := range configuredModels {
		configuredModelKeys = append(configuredModelKeys, channelModelTestKey(modelName))
	}
	query := tx.Model(&ChannelModelTestItem{}).Where("channel_id = ?", channelId)
	if len(configuredModelKeys) > 0 {
		query = query.Where("model_key NOT IN ?", configuredModelKeys)
	}

	var itemIds []int64
	if err := query.Pluck("id", &itemIds).Error; err != nil {
		return err
	}
	if len(itemIds) == 0 {
		return nil
	}
	if err := tx.Where("item_id IN ?", itemIds).Delete(&ChannelModelTestHistory{}).Error; err != nil {
		return err
	}
	return tx.Where("id IN ?", itemIds).Delete(&ChannelModelTestItem{}).Error
}

func deleteChannelModelTestsForChannels(tx *gorm.DB, channelIds []int) error {
	if len(channelIds) == 0 {
		return nil
	}
	if err := tx.Where("channel_id IN ?", channelIds).Delete(&ChannelModelTestHistory{}).Error; err != nil {
		return err
	}
	return tx.Where("channel_id IN ?", channelIds).Delete(&ChannelModelTestItem{}).Error
}

func normalizeChannelModelNames(models string) []string {
	seen := make(map[string]struct{})
	names := make([]string, 0)
	for _, modelName := range strings.Split(models, ",") {
		modelName = strings.TrimSpace(modelName)
		if modelName == "" {
			continue
		}
		if _, ok := seen[modelName]; ok {
			continue
		}
		seen[modelName] = struct{}{}
		names = append(names, modelName)
	}
	return names
}
