package model

import (
	"context"
	"errors"
	"net"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"gorm.io/gorm"
)

const (
	ipLogAuditCursorID  = 1
	ipLogAuditBatchSize = 1000
)

// IPLogAudit stores cumulative statistics for every valid IP recorded in logs.
type IPLogAudit struct {
	Id               int    `json:"id"`
	IP               string `json:"ip" gorm:"type:varchar(45);uniqueIndex"`
	Network          string `json:"network" gorm:"type:varchar(64);index"`
	ASN              uint32 `json:"asn" gorm:"type:bigint;index"`
	IPVersion        int    `json:"ip_version"`
	IsPrivate        bool   `json:"is_private"`
	LogCount         int64  `json:"log_count" gorm:"bigint"`
	RequestCount     int64  `json:"request_count" gorm:"bigint;index"`
	ConsumeCount     int64  `json:"consume_count" gorm:"bigint"`
	ErrorCount       int64  `json:"error_count" gorm:"bigint;index"`
	LoginCount       int64  `json:"login_count" gorm:"bigint"`
	ManageCount      int64  `json:"manage_count" gorm:"bigint"`
	PromptTokens     int64  `json:"prompt_tokens" gorm:"bigint"`
	CompletionTokens int64  `json:"completion_tokens" gorm:"bigint"`
	Quota            int64  `json:"quota" gorm:"bigint;index"`
	FirstSeenAt      int64  `json:"first_seen_at" gorm:"bigint;index"`
	LastSeenAt       int64  `json:"last_seen_at" gorm:"bigint;index"`
	LastScannedAt    int64  `json:"last_scanned_at" gorm:"bigint"`
	LastUserID       int    `json:"last_user_id"`
	LastUsername     string `json:"last_username" gorm:"type:varchar(191);index"`
	LastModelName    string `json:"last_model_name" gorm:"type:varchar(191);index"`
	LastTokenName    string `json:"last_token_name" gorm:"type:varchar(191)"`
	Banned           bool   `json:"banned" gorm:"-"`
}

// IPLogAuditCursor makes each scan incremental. It is persisted in the primary
// database together with audit updates so a failed scan can safely resume.
type IPLogAuditCursor struct {
	Id            int    `json:"id" gorm:"primaryKey"`
	LastCreatedAt int64  `json:"last_created_at" gorm:"bigint"`
	LastLogID     int64  `json:"last_log_id" gorm:"bigint"`
	LastRequestID string `json:"last_request_id" gorm:"type:varchar(64)"`
	LastScannedAt int64  `json:"last_scanned_at" gorm:"bigint"`
}

type IPLogAuditSummary struct {
	IPCount       int64 `json:"ip_count"`
	RequestCount  int64 `json:"request_count"`
	ErrorCount    int64 `json:"error_count"`
	LogCount      int64 `json:"log_count"`
	LastScannedAt int64 `json:"last_scanned_at"`
}

type IPLogAuditScanResult struct {
	LogsScanned int64 `json:"logs_scanned"`
	Batches     int   `json:"batches"`
	ScannedAt   int64 `json:"scanned_at"`
}

type ipLogAuditDelta struct {
	IPLogAudit
}

func getIPLogAuditCursor() (*IPLogAuditCursor, error) {
	cursor := &IPLogAuditCursor{Id: ipLogAuditCursorID}
	err := DB.Where("id = ?", ipLogAuditCursorID).First(cursor).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return cursor, nil
	}
	return cursor, err
}

// ScanIPLogAudits processes every unscanned log with an IP. A two-second
// cutoff avoids missing a concurrently inserted row that shares the cursor's
// latest second but sorts before it.
func ScanIPLogAudits(ctx context.Context) (IPLogAuditScanResult, error) {
	result := IPLogAuditScanResult{ScannedAt: common.GetTimestamp() - 2}
	cursor, err := getIPLogAuditCursor()
	if err != nil {
		return result, err
	}

	for {
		if err := ctx.Err(); err != nil {
			return result, err
		}

		var logs []Log
		query := LOG_DB.WithContext(ctx).Model(&Log{}).
			Select("id, user_id, created_at, type, username, token_name, model_name, quota, prompt_tokens, completion_tokens, ip, request_id").
			Where("ip <> ? AND created_at <= ?", "", result.ScannedAt)
		if common.UsingLogDatabase(common.DatabaseTypeClickHouse) {
			query = query.Where("(created_at > ? OR (created_at = ? AND request_id > ?))", cursor.LastCreatedAt, cursor.LastCreatedAt, cursor.LastRequestID).
				Order("created_at asc, request_id asc")
		} else {
			query = query.Where("(created_at > ? OR (created_at = ? AND id > ?))", cursor.LastCreatedAt, cursor.LastCreatedAt, cursor.LastLogID).
				Order("created_at asc, id asc")
		}
		if err := query.Limit(ipLogAuditBatchSize).Find(&logs).Error; err != nil {
			return result, err
		}
		if len(logs) == 0 {
			break
		}

		deltas := make(map[string]*ipLogAuditDelta)
		for i := range logs {
			log := &logs[i]
			normalized, network, asn, identityErr := registrationIdentity(log.Ip)
			if identityErr != nil {
				continue
			}
			delta := deltas[normalized]
			if delta == nil {
				parsed := net.ParseIP(normalized)
				version := 6
				if parsed.To4() != nil {
					version = 4
				}
				delta = &ipLogAuditDelta{IPLogAudit: IPLogAudit{
					IP: normalized, Network: network, ASN: asn, IPVersion: version,
					IsPrivate: common.IsPrivateIP(parsed), FirstSeenAt: log.CreatedAt,
				}}
				deltas[normalized] = delta
			}
			delta.LogCount++
			if log.CreatedAt < delta.FirstSeenAt {
				delta.FirstSeenAt = log.CreatedAt
			}
			if log.CreatedAt >= delta.LastSeenAt {
				delta.LastSeenAt = log.CreatedAt
				if log.UserId != 0 {
					delta.LastUserID = log.UserId
				}
				if log.Username != "" {
					delta.LastUsername = log.Username
				}
				if log.ModelName != "" {
					delta.LastModelName = log.ModelName
				}
				if log.TokenName != "" {
					delta.LastTokenName = log.TokenName
				}
			}
			switch log.Type {
			case LogTypeConsume:
				delta.RequestCount++
				delta.ConsumeCount++
			case LogTypeError:
				delta.RequestCount++
				delta.ErrorCount++
			case LogTypeLogin:
				delta.LoginCount++
			case LogTypeManage:
				delta.ManageCount++
			}
			delta.PromptTokens += int64(log.PromptTokens)
			delta.CompletionTokens += int64(log.CompletionTokens)
			delta.Quota += int64(log.Quota)
		}

		lastLog := logs[len(logs)-1]
		cursor.LastCreatedAt = lastLog.CreatedAt
		cursor.LastLogID = int64(lastLog.Id)
		cursor.LastRequestID = lastLog.RequestId
		if err := applyIPLogAuditBatch(ctx, deltas, cursor, result.ScannedAt); err != nil {
			return result, err
		}
		result.LogsScanned += int64(len(logs))
		result.Batches++
	}

	cursor.LastScannedAt = result.ScannedAt
	if err := DB.WithContext(ctx).Save(cursor).Error; err != nil {
		return result, err
	}
	return result, nil
}

func applyIPLogAuditBatch(ctx context.Context, deltas map[string]*ipLogAuditDelta, cursor *IPLogAuditCursor, scannedAt int64) error {
	return DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for _, delta := range deltas {
			var audit IPLogAudit
			err := lockForUpdate(tx).Where("ip = ?", delta.IP).First(&audit).Error
			if errors.Is(err, gorm.ErrRecordNotFound) {
				audit = delta.IPLogAudit
				audit.LastScannedAt = scannedAt
				if err := tx.Create(&audit).Error; err != nil {
					return err
				}
				continue
			}
			if err != nil {
				return err
			}
			audit.LogCount += delta.LogCount
			audit.RequestCount += delta.RequestCount
			audit.ConsumeCount += delta.ConsumeCount
			audit.ErrorCount += delta.ErrorCount
			audit.LoginCount += delta.LoginCount
			audit.ManageCount += delta.ManageCount
			audit.PromptTokens += delta.PromptTokens
			audit.CompletionTokens += delta.CompletionTokens
			audit.Quota += delta.Quota
			if audit.FirstSeenAt == 0 || delta.FirstSeenAt < audit.FirstSeenAt {
				audit.FirstSeenAt = delta.FirstSeenAt
			}
			if delta.LastSeenAt >= audit.LastSeenAt {
				audit.LastSeenAt = delta.LastSeenAt
				if delta.LastUserID != 0 {
					audit.LastUserID = delta.LastUserID
				}
				if delta.LastUsername != "" {
					audit.LastUsername = delta.LastUsername
				}
				if delta.LastModelName != "" {
					audit.LastModelName = delta.LastModelName
				}
				if delta.LastTokenName != "" {
					audit.LastTokenName = delta.LastTokenName
				}
			}
			audit.LastScannedAt = scannedAt
			if err := tx.Save(&audit).Error; err != nil {
				return err
			}
		}
		return tx.Save(cursor).Error
	})
}

func ListIPLogAudits(startIdx, limit int, keyword, sortBy string) ([]*IPLogAudit, int64, error) {
	query := DB.Model(&IPLogAudit{})
	keyword = strings.TrimSpace(keyword)
	if keyword != "" {
		if normalized, err := normalizeIP(keyword); err == nil {
			query = query.Where("ip = ?", normalized)
		} else {
			pattern := "%" + keyword + "%"
			query = query.Where("ip LIKE ? OR network LIKE ? OR last_username LIKE ? OR last_model_name LIKE ?", pattern, pattern, pattern, pattern)
		}
	}
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	order := "last_seen_at desc, id desc"
	switch sortBy {
	case "calls":
		order = "request_count desc, id desc"
	case "errors":
		order = "error_count desc, id desc"
	case "quota":
		order = "quota desc, id desc"
	}
	var audits []*IPLogAudit
	if err := query.Order(order).Limit(limit).Offset(startIdx).Find(&audits).Error; err != nil {
		return nil, 0, err
	}
	if len(audits) == 0 {
		return audits, total, nil
	}
	ips := make([]string, 0, len(audits))
	for _, audit := range audits {
		ips = append(ips, audit.IP)
	}
	var bannedIPs []string
	if err := DB.Model(&IPBan{}).
		Where("ip IN ? AND status = ? AND (expires_at = 0 OR expires_at > ?)", ips, IPBanStatusActive, common.GetTimestamp()).
		Pluck("ip", &bannedIPs).Error; err != nil {
		return nil, 0, err
	}
	banned := make(map[string]struct{}, len(bannedIPs))
	for _, ip := range bannedIPs {
		banned[ip] = struct{}{}
	}
	for _, audit := range audits {
		_, audit.Banned = banned[audit.IP]
	}
	return audits, total, nil
}

func GetIPLogAuditSummary() (IPLogAuditSummary, error) {
	var summary IPLogAuditSummary
	if err := DB.Model(&IPLogAudit{}).Select(
		"COUNT(*) AS ip_count, COALESCE(SUM(request_count), 0) AS request_count, COALESCE(SUM(error_count), 0) AS error_count, COALESCE(SUM(log_count), 0) AS log_count",
	).Scan(&summary).Error; err != nil {
		return summary, err
	}
	cursor, err := getIPLogAuditCursor()
	if err != nil {
		return summary, err
	}
	summary.LastScannedAt = cursor.LastScannedAt
	return summary, nil
}
