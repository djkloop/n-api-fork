package middleware

import (
	"crypto/sha256"
	"fmt"
	"net/http"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"

	"github.com/gin-gonic/gin"
)

const (
	EmailVerificationRateLimitMark      = "EV"
	EmailVerificationMaxRequests        = 2
	EmailVerificationDuration           = 30
	EmailVerificationMailboxMaxRequests = 3
	EmailVerificationMailboxDuration    = 10 * 60
)

func emailVerificationMailboxKey(email string) (string, bool) {
	canonical, err := model.CanonicalizeEmail(email)
	if err != nil || canonical == "" {
		return "", false
	}
	hash := sha256.Sum256([]byte(canonical))
	return fmt.Sprintf("%s:email:%s:%x", redisRateLimitNamespace, EmailVerificationRateLimitMark, hash), true
}

func rejectEmailVerificationRateLimit(c *gin.Context, waitSeconds int64) {
	if waitSeconds <= 0 {
		waitSeconds = EmailVerificationDuration
	}
	c.JSON(http.StatusTooManyRequests, gin.H{
		"success": false,
		"message": fmt.Sprintf("发送过于频繁，请等待 %d 秒后再试", waitSeconds),
	})
	c.Abort()
}

func redisEmailVerificationRateLimiter(c *gin.Context) {
	allowed, _, ttlSeconds, err := redisFixedWindowTake(
		c.Request.Context(),
		redisIPRateLimitKey(EmailVerificationRateLimitMark, c.ClientIP()),
		EmailVerificationMaxRequests,
		EmailVerificationDuration,
	)
	if err != nil {
		memoryEmailVerificationRateLimiter(c)
		return
	}
	if !allowed {
		rejectEmailVerificationRateLimit(c, ttlSeconds)
		return
	}

	mailboxKey, hasMailbox := emailVerificationMailboxKey(c.Query("email"))
	if hasMailbox {
		allowed, _, ttlSeconds, err = redisFixedWindowTake(
			c.Request.Context(),
			mailboxKey,
			EmailVerificationMailboxMaxRequests,
			EmailVerificationMailboxDuration,
		)
		if err != nil {
			memoryEmailVerificationRateLimiter(c)
			return
		}
		if !allowed {
			rejectEmailVerificationRateLimit(c, ttlSeconds)
			return
		}
	}
	c.Next()
}

func memoryEmailVerificationRateLimiter(c *gin.Context) {
	ipKey := EmailVerificationRateLimitMark + ":ip:" + c.ClientIP()
	if !inMemoryRateLimiter.Request(ipKey, EmailVerificationMaxRequests, EmailVerificationDuration) {
		rejectEmailVerificationRateLimit(c, EmailVerificationDuration)
		return
	}
	if mailboxKey, ok := emailVerificationMailboxKey(c.Query("email")); ok &&
		!inMemoryRateLimiter.Request(mailboxKey, EmailVerificationMailboxMaxRequests, EmailVerificationMailboxDuration) {
		rejectEmailVerificationRateLimit(c, EmailVerificationMailboxDuration)
		return
	}
	c.Next()
}

func EmailVerificationRateLimit() gin.HandlerFunc {
	// Keep the fallback ready before requests arrive so a concurrent Redis
	// outage cannot race the in-memory limiter's first initialization.
	inMemoryRateLimiter.Init(common.RateLimitKeyExpirationDuration)
	return func(c *gin.Context) {
		if common.RedisEnabled {
			redisEmailVerificationRateLimiter(c)
		} else {
			memoryEmailVerificationRateLimiter(c)
		}
	}
}
