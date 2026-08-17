package common

import (
	"context"
	"crypto/rand"
	"encoding/binary"
	"image"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/golang/freetype/truetype"
	"github.com/google/uuid"
	assetschars "github.com/wenlng/go-captcha-assets/bindata/chars"
	assetsfont "github.com/wenlng/go-captcha-assets/resources/fonts/fzshengsksjw"
	assetsimages "github.com/wenlng/go-captcha-assets/resources/imagesv2"
	assetstiles "github.com/wenlng/go-captcha-assets/resources/tiles"
	"github.com/wenlng/go-captcha/v2/base/option"
	"github.com/wenlng/go-captcha/v2/click"
	"github.com/wenlng/go-captcha/v2/rotate"
	"github.com/wenlng/go-captcha/v2/slide"
)

const (
	registrationCaptchaRedisPrefix = "registration_captcha:"
	registrationCaptchaTTL         = 5 * time.Minute

	CaptchaTypeClick  = "click"
	CaptchaTypeSlide  = "slide"
	CaptchaTypeDrag   = "drag"
	CaptchaTypeRotate = "rotate"
)

type BehaviorCaptchaPoint struct {
	X int `json:"x"`
	Y int `json:"y"`
	W int `json:"w,omitempty"`
	H int `json:"h,omitempty"`
}

type behaviorCaptchaState struct {
	Type        string
	ClickPoints []BehaviorCaptchaPoint
	SlidePoint  BehaviorCaptchaPoint
	RotateAngle int
	ExpiresAt   time.Time
}

type behaviorCaptchaStore struct {
	mu     sync.Mutex
	values map[string]behaviorCaptchaState
}

var behaviorStore = &behaviorCaptchaStore{values: make(map[string]behaviorCaptchaState)}
var verifiedBehaviorStore = &behaviorCaptchaStore{values: make(map[string]behaviorCaptchaState)}
var behaviorResources struct {
	once   sync.Once
	font   *truetype.Font
	images []image.Image
	tiles  []*slide.GraphImage
	err    error
}

func loadBehaviorCaptchaResources() error {
	behaviorResources.once.Do(func() {
		behaviorResources.font, behaviorResources.err = assetsfont.GetFont()
		if behaviorResources.err != nil {
			return
		}
		behaviorResources.images, behaviorResources.err = assetsimages.GetImages()
		if behaviorResources.err != nil {
			return
		}
		assets, tileErr := assetstiles.GetTiles()
		if tileErr != nil {
			behaviorResources.err = tileErr
			return
		}
		for _, item := range assets {
			behaviorResources.tiles = append(behaviorResources.tiles, &slide.GraphImage{
				OverlayImage: item.OverlayImage,
				ShadowImage:  item.ShadowImage,
				MaskImage:    item.MaskImage,
			})
		}
	})
	return behaviorResources.err
}

type BehaviorCaptchaResponse struct {
	ID          string `json:"id"`
	Type        string `json:"type"`
	Image       string `json:"image,omitempty"`
	Thumb       string `json:"thumb,omitempty"`
	ThumbX      int    `json:"thumb_x,omitempty"`
	ThumbY      int    `json:"thumb_y,omitempty"`
	ThumbWidth  int    `json:"thumb_width,omitempty"`
	ThumbHeight int    `json:"thumb_height,omitempty"`
	ThumbSize   int    `json:"thumb_size,omitempty"`
}

type BehaviorCaptchaPayload struct {
	ClickPoints []BehaviorCaptchaPoint `json:"click_points,omitempty"`
	X           int                    `json:"x,omitempty"`
	Y           int                    `json:"y,omitempty"`
	Angle       int                    `json:"angle,omitempty"`
}

func randomBehaviorCaptchaType() string {
	weights := map[string]int{
		CaptchaTypeClick: 25, CaptchaTypeSlide: 25, CaptchaTypeDrag: 25, CaptchaTypeRotate: 25,
	}
	total := 0
	for _, item := range strings.Split(RegistrationCaptchaWeights, ",") {
		parts := strings.SplitN(strings.TrimSpace(item), ":", 2)
		if len(parts) != 2 {
			continue
		}
		value, err := strconv.Atoi(strings.TrimSpace(parts[1]))
		if err == nil && value > 0 {
			if _, ok := weights[strings.TrimSpace(parts[0])]; ok {
				weights[strings.TrimSpace(parts[0])] = value
			}
		}
	}
	for _, value := range weights {
		total += value
	}
	if total <= 0 {
		return CaptchaTypeClick
	}
	var b [4]byte
	if _, err := rand.Read(b[:]); err != nil {
		return CaptchaTypeClick
	}
	n := int(binary.BigEndian.Uint32(b[:]) % uint32(total))
	for _, typ := range []string{CaptchaTypeClick, CaptchaTypeSlide, CaptchaTypeDrag, CaptchaTypeRotate} {
		if n < weights[typ] {
			return typ
		}
		n -= weights[typ]
	}
	return CaptchaTypeClick
}

func behaviorCaptchaClickPoints(dots map[int]*click.Dot) []BehaviorCaptchaPoint {
	points := make([]BehaviorCaptchaPoint, 0, len(dots))
	for i := 0; i < len(dots); i++ {
		dot := dots[i]
		points = append(points, BehaviorCaptchaPoint{X: dot.X, Y: dot.Y, W: dot.Width, H: dot.Height})
	}
	return points
}

func storeBehaviorCaptcha(id string, state behaviorCaptchaState) error {
	if RedisEnabled && RDB != nil {
		data, err := Marshal(state)
		if err != nil {
			return err
		}
		return RDB.Set(context.Background(), registrationCaptchaRedisPrefix+"behavior:"+id, data, registrationCaptchaTTL).Err()
	}
	behaviorStore.mu.Lock()
	defer behaviorStore.mu.Unlock()
	behaviorStore.values[id] = state
	return nil
}

func consumeBehaviorCaptcha(id string) (behaviorCaptchaState, bool) {
	var state behaviorCaptchaState
	if RedisEnabled && RDB != nil {
		key := registrationCaptchaRedisPrefix + "behavior:" + id
		data, err := RDB.Eval(context.Background(), `local value=redis.call('GET',KEYS[1]); if value then redis.call('DEL',KEYS[1]) end; return value`, []string{key}).Text()
		if err != nil {
			return state, false
		}
		if Unmarshal([]byte(data), &state) != nil {
			return state, false
		}
		return state, time.Now().Before(state.ExpiresAt)
	}
	behaviorStore.mu.Lock()
	defer behaviorStore.mu.Unlock()
	state, ok := behaviorStore.values[id]
	delete(behaviorStore.values, id)
	return state, ok && time.Now().Before(state.ExpiresAt)
}

func GenerateBehaviorCaptcha() (BehaviorCaptchaResponse, error) {
	return generateBehaviorCaptcha(randomBehaviorCaptchaType())
}

func generateBehaviorCaptcha(typ string) (BehaviorCaptchaResponse, error) {
	if err := loadBehaviorCaptchaResources(); err != nil {
		return BehaviorCaptchaResponse{}, err
	}
	id := uuid.NewString()
	state := behaviorCaptchaState{Type: typ, ExpiresAt: time.Now().Add(registrationCaptchaTTL)}
	response := BehaviorCaptchaResponse{ID: id, Type: typ}
	var err error

	switch typ {
	case CaptchaTypeClick:
		builder := click.NewBuilder(click.WithRangeLen(option.RangeVal{Min: 5, Max: 6}), click.WithRangeVerifyLen(option.RangeVal{Min: 2, Max: 3}))
		builder.SetResources(click.WithChars(assetschars.GetAlphaChars()), click.WithFonts([]*truetype.Font{behaviorResources.font}), click.WithBackgrounds(behaviorResources.images))
		data, genErr := builder.Make().Generate()
		err = genErr
		if err == nil {
			response.Image, err = data.GetMasterImage().ToBase64()
			if err == nil {
				response.Thumb, err = data.GetThumbImage().ToBase64()
			}
		}
		if err == nil {
			state.ClickPoints = behaviorCaptchaClickPoints(data.GetData())
		}
	case CaptchaTypeSlide, CaptchaTypeDrag:
		builder := slide.NewBuilder(slide.WithGenGraphNumber(1))
		graphs := make([]*slide.GraphImage, len(behaviorResources.tiles))
		copy(graphs, behaviorResources.tiles)
		builder.SetResources(slide.WithBackgrounds(behaviorResources.images), slide.WithGraphImages(graphs))
		captcha := builder.Make()
		if typ == CaptchaTypeDrag {
			captcha = builder.MakeDragDrop()
		}
		data, genErr := captcha.Generate()
		err = genErr
		if err == nil {
			response.Image, err = data.GetMasterImage().ToBase64()
			if err == nil {
				response.Thumb, err = data.GetTileImage().ToBase64()
			}
		}
		if err == nil {
			block := data.GetData()
			state.SlidePoint = BehaviorCaptchaPoint{X: block.X, Y: block.Y}
			response.ThumbX, response.ThumbY, response.ThumbWidth, response.ThumbHeight = block.DX, block.DY, block.Width, block.Height
		}
	case CaptchaTypeRotate:
		builder := rotate.NewBuilder(rotate.WithImageSquareSize(220))
		builder.SetResources(rotate.WithImages(behaviorResources.images))
		data, genErr := builder.Make().Generate()
		err = genErr
		if err == nil {
			response.Image, err = data.GetMasterImage().ToBase64()
			if err == nil {
				response.Thumb, err = data.GetThumbImage().ToBase64()
			}
		}
		if err == nil {
			block := data.GetData()
			state.RotateAngle = block.Angle
			response.ThumbSize = block.Width
		}
	}
	if err != nil {
		return BehaviorCaptchaResponse{}, err
	}
	if err = storeBehaviorCaptcha(id, state); err != nil {
		return BehaviorCaptchaResponse{}, err
	}
	return response, nil
}

func VerifyBehaviorCaptcha(id, typ string, payload BehaviorCaptchaPayload) bool {
	state, ok := consumeBehaviorCaptcha(strings.TrimSpace(id))
	if !ok || state.Type != typ {
		return false
	}
	return validateBehaviorCaptcha(state, typ, payload)
}

func VerifyBehaviorCaptchaForEmail(id, typ string, payload BehaviorCaptchaPayload) bool {
	id = strings.TrimSpace(id)
	if !VerifyBehaviorCaptcha(id, typ, payload) {
		return false
	}
	return storeVerifiedBehaviorCaptcha(id, behaviorCaptchaState{Type: typ, ExpiresAt: time.Now().Add(registrationCaptchaTTL)}) == nil
}

func ConsumeVerifiedBehaviorCaptcha(id, typ string) bool {
	state, ok := consumeStoredBehaviorCaptcha(verifiedBehaviorStore, registrationCaptchaRedisPrefix+"verified:", id)
	return ok && state.Type == typ
}

func storeVerifiedBehaviorCaptcha(id string, state behaviorCaptchaState) error {
	if RedisEnabled && RDB != nil {
		data, err := Marshal(state)
		if err != nil {
			return err
		}
		return RDB.Set(context.Background(), registrationCaptchaRedisPrefix+"verified:"+id, data, registrationCaptchaTTL).Err()
	}
	verifiedBehaviorStore.mu.Lock()
	defer verifiedBehaviorStore.mu.Unlock()
	verifiedBehaviorStore.values[id] = state
	return nil
}

func consumeStoredBehaviorCaptcha(store *behaviorCaptchaStore, redisPrefix, id string) (behaviorCaptchaState, bool) {
	var state behaviorCaptchaState
	id = strings.TrimSpace(id)
	if RedisEnabled && RDB != nil {
		key := redisPrefix + id
		data, err := RDB.Eval(context.Background(), `local value=redis.call('GET',KEYS[1]); if value then redis.call('DEL',KEYS[1]) end; return value`, []string{key}).Text()
		if err != nil || Unmarshal([]byte(data), &state) != nil {
			return state, false
		}
		return state, time.Now().Before(state.ExpiresAt)
	}
	store.mu.Lock()
	defer store.mu.Unlock()
	state, ok := store.values[id]
	delete(store.values, id)
	return state, ok && time.Now().Before(state.ExpiresAt)
}

func validateBehaviorCaptcha(state behaviorCaptchaState, typ string, payload BehaviorCaptchaPayload) bool {
	switch typ {
	case CaptchaTypeClick:
		if len(payload.ClickPoints) != len(state.ClickPoints) {
			return false
		}
		for i, point := range payload.ClickPoints {
			target := state.ClickPoints[i]
			if !click.Validate(point.X, point.Y, target.X, target.Y, target.W, target.H, 12) {
				return false
			}
		}
		return true
	case CaptchaTypeSlide, CaptchaTypeDrag:
		return slide.Validate(payload.X, payload.Y, state.SlidePoint.X, state.SlidePoint.Y, 8)
	case CaptchaTypeRotate:
		return rotate.Validate(state.RotateAngle, payload.Angle, 8)
	default:
		return false
	}
}
