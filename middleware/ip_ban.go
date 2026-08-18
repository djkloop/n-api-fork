package middleware

import (
	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/i18n"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
)

func RegistrationIPBan() gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.GetInt("id") > 0 {
			c.Next()
			return
		}
		banned, err := model.IsRegistrationBlocked(c.ClientIP())
		if err != nil {
			common.ApiError(c, err)
			c.Abort()
			return
		}
		if banned {
			common.ApiErrorI18n(c, i18n.MsgUserRegistrationIPBlocked)
			c.Abort()
			return
		}
		c.Next()
	}
}
