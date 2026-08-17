package controller

import (
	"errors"
	"strconv"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type IPBanRequest struct {
	IP        string `json:"ip"`
	Reason    string `json:"reason"`
	ExpiresAt int64  `json:"expires_at"`
}

func GetIPBans(c *gin.Context) {
	pageInfo := common.GetPageQuery(c)
	bans, total, err := model.ListIPBans(pageInfo.GetStartIdx(), pageInfo.GetPageSize(), c.Query("keyword"))
	if err != nil {
		common.ApiError(c, err)
		return
	}
	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(bans)
	common.ApiSuccess(c, pageInfo)
}

func CreateIPBan(c *gin.Context) {
	var req IPBanRequest
	if err := common.DecodeJson(c.Request.Body, &req); err != nil || strings.TrimSpace(req.IP) == "" {
		common.ApiErrorMsg(c, "invalid IP ban parameters")
		return
	}
	if req.ExpiresAt < 0 || (req.ExpiresAt != 0 && req.ExpiresAt <= common.GetTimestamp()) {
		common.ApiErrorMsg(c, "expiration must be in the future or zero for permanent")
		return
	}
	ban, err := model.UpsertIPBan(req.IP, req.Reason, model.IPBanSourceManual, req.ExpiresAt)
	if err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}
	operatorID := c.GetInt("id")
	model.RecordOperationAuditLog(operatorID, "Manually blocked IP "+ban.IP, c.ClientIP(), "ip_ban.create", map[string]interface{}{
		"ip": ban.IP, "reason": ban.Reason, "expires_at": ban.ExpiresAt,
	}, nil, nil)
	common.ApiSuccess(c, ban)
}

func ReleaseIPBan(c *gin.Context) {
	id, err := parseID(c.Param("id"))
	if err != nil {
		common.ApiErrorMsg(c, "invalid IP ban id")
		return
	}
	if err := model.ReleaseIPBan(id, c.GetInt("id")); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			common.ApiErrorMsg(c, "IP ban not found or already released")
			return
		}
		common.ApiError(c, err)
		return
	}
	model.RecordOperationAuditLog(c.GetInt("id"), "Released IP ban", c.ClientIP(), "ip_ban.release", gin.H{"id": id}, nil, nil)
	common.ApiSuccess(c, gin.H{"id": id})
}

func parseID(value string) (int, error) {
	id, err := strconv.Atoi(value)
	if err != nil || id <= 0 {
		return 0, errors.New("invalid id")
	}
	return id, nil
}
