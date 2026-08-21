package model

import (
	"strings"

	"github.com/QuantumNous/new-api/common"
)

type IPLogAuditEvent struct {
	ID               int    `json:"id"`
	CreatedAt        int64  `json:"created_at"`
	Type             int    `json:"type"`
	Username         string `json:"username"`
	ModelName        string `json:"model_name"`
	TokenName        string `json:"token_name"`
	Quota            int    `json:"quota"`
	PromptTokens     int    `json:"prompt_tokens"`
	CompletionTokens int    `json:"completion_tokens"`
	UseTime          int    `json:"use_time"`
	RequestID        string `json:"request_id"`
	RequestHost      string `json:"request_host"`
}

func ListIPLogAuditEvents(ip string, startIdx, limit int) ([]IPLogAuditEvent, int64, error) {
	normalized, err := normalizeIP(ip)
	if err != nil {
		return nil, 0, err
	}

	query := LOG_DB.Model(&Log{}).Where("ip = ?", normalized)
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	order := "created_at desc, id desc"
	if common.UsingLogDatabase(common.DatabaseTypeClickHouse) {
		order = "created_at desc, request_id desc"
	}
	var logs []Log
	if err := query.Select("id, created_at, type, username, model_name, token_name, quota, prompt_tokens, completion_tokens, use_time, request_id, other").
		Order(order).Limit(limit).Offset(startIdx).Find(&logs).Error; err != nil {
		return nil, 0, err
	}

	events := make([]IPLogAuditEvent, 0, len(logs))
	for _, log := range logs {
		requestHost := ""
		if other, err := common.StrToMap(log.Other); err == nil {
			if adminInfo, ok := other["admin_info"].(map[string]interface{}); ok {
				requestHost, _ = adminInfo["request_host"].(string)
			}
		}
		events = append(events, IPLogAuditEvent{
			ID: log.Id, CreatedAt: log.CreatedAt, Type: log.Type, Username: strings.TrimSpace(log.Username),
			ModelName: log.ModelName, TokenName: log.TokenName, Quota: log.Quota,
			PromptTokens: log.PromptTokens, CompletionTokens: log.CompletionTokens,
			UseTime: log.UseTime, RequestID: log.RequestId, RequestHost: requestHost,
		})
	}
	return events, total, nil
}
