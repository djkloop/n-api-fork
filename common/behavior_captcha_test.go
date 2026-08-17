package common

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/wenlng/go-captcha/v2/click"
)

func TestBehaviorCaptchaClickPointsPreserveChallengeOrder(t *testing.T) {
	dots := map[int]*click.Dot{
		1: {X: 30, Y: 40, Width: 12, Height: 14},
		0: {X: 10, Y: 20, Width: 8, Height: 9},
	}

	assert.Equal(t, []BehaviorCaptchaPoint{
		{X: 10, Y: 20, W: 8, H: 9},
		{X: 30, Y: 40, W: 12, H: 14},
	}, behaviorCaptchaClickPoints(dots))
}

func TestGeneratedSlideCaptchasValidateTargetInsteadOfInitialPosition(t *testing.T) {
	originalRedisEnabled := RedisEnabled
	originalRDB := RDB
	RedisEnabled = false
	RDB = nil
	t.Cleanup(func() {
		RedisEnabled = originalRedisEnabled
		RDB = originalRDB
	})

	for _, captchaType := range []string{CaptchaTypeSlide, CaptchaTypeDrag} {
		t.Run(captchaType, func(t *testing.T) {
			response, err := generateBehaviorCaptcha(captchaType)
			require.NoError(t, err)

			behaviorStore.mu.Lock()
			state, ok := behaviorStore.values[response.ID]
			behaviorStore.mu.Unlock()
			require.True(t, ok)

			initialPosition := BehaviorCaptchaPoint{X: response.ThumbX, Y: response.ThumbY}
			assert.NotEqual(t, initialPosition, state.SlidePoint)
			assert.True(t, VerifyBehaviorCaptcha(response.ID, response.Type, BehaviorCaptchaPayload{
				X: state.SlidePoint.X,
				Y: state.SlidePoint.Y,
			}))
		})
	}
}
