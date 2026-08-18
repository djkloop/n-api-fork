package model

import (
	"errors"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func resetEmailIdentityTables(t *testing.T) {
	t.Helper()
	require.NoError(t, DB.Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(&ExternalIdentityClaim{}).Error)
	require.NoError(t, DB.Unscoped().Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(&User{}).Error)
}

func TestCanonicalizeEmailProviderAliases(t *testing.T) {
	tests := []struct {
		name  string
		email string
		want  string
	}{
		{name: "outlook plus alias", email: "User.Name+campaign@Outlook.com", want: "user.name@outlook.com"},
		{name: "gmail dots and plus alias", email: "First.Last+campaign@Gmail.com", want: "firstlast@gmail.com"},
		{name: "googlemail maps to gmail", email: "first.last@googlemail.com", want: "firstlast@gmail.com"},
		{name: "other provider preserves plus", email: "user+tag@example.com", want: "user+tag@example.com"},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			got, err := CanonicalizeEmail(test.email)
			require.NoError(t, err)
			assert.Equal(t, test.want, got)
		})
	}
}

func TestCanonicalizeEmailRejectsMalformedAliasIdentity(t *testing.T) {
	_, err := CanonicalizeEmail("+campaign@outlook.com")
	require.ErrorIs(t, err, ErrInvalidEmailIdentity)
}

func TestUserInsertRejectsProviderAliasOfClaimedMailbox(t *testing.T) {
	resetEmailIdentityTables(t)

	first := User{Username: "alias-first", Password: "password123", Email: "mailbox+first@outlook.com", Role: common.RoleCommonUser}
	require.NoError(t, first.Insert(0))

	second := User{Username: "alias-second", Password: "password123", Email: "mailbox+second@outlook.com", Role: common.RoleCommonUser}
	err := second.Insert(0)
	require.ErrorIs(t, err, ErrEmailAlreadyTaken)

	var count int64
	require.NoError(t, DB.Unscoped().Model(&User{}).Count(&count).Error)
	assert.EqualValues(t, 1, count)
}

func TestEmailCanonicalBackfillGrandfathersHistoricalCollisions(t *testing.T) {
	resetEmailIdentityTables(t)

	users := []User{
		{Username: "legacy-alias-one", Password: "hash", Email: "legacy+one@outlook.com", AffCode: "legacy-alias-code-1", Role: common.RoleCommonUser},
		{Username: "legacy-alias-two", Password: "hash", Email: "legacy+two@outlook.com", AffCode: "legacy-alias-code-2", Role: common.RoleCommonUser},
	}
	require.NoError(t, DB.Create(&users).Error)
	require.NoError(t, InitializeUserEmailCanonicals())
	require.NoError(t, initializeCanonicalEmailClaims())

	var claims []ExternalIdentityClaim
	require.NoError(t, DB.Where("provider = ?", ExternalIdentityProviderEmailCanonical).Find(&claims).Error)
	require.Len(t, claims, 1)
	assert.Equal(t, users[0].Id, claims[0].UserId)
	assert.Equal(t, "legacy@outlook.com", claims[0].Subject)

	newUser := User{Username: "legacy-alias-three", Password: "password123", Email: "legacy+three@outlook.com", Role: common.RoleCommonUser}
	err := newUser.Insert(0)
	require.ErrorIs(t, err, ErrEmailAlreadyTaken)

	for _, email := range []string{"legacy+one@outlook.com", "legacy+two@outlook.com"} {
		user, err := GetUniqueUserByEmail(email)
		require.NoError(t, err)
		assert.Equal(t, email, user.Email)
	}
}

func TestReplaceCanonicalEmailClaimRollsBackOnConflict(t *testing.T) {
	resetEmailIdentityTables(t)

	first := User{Username: "claim-owner", Password: "password123", Email: "owner@outlook.com", Role: common.RoleCommonUser}
	second := User{Username: "claim-rebind", Password: "password123", Email: "second@outlook.com", Role: common.RoleCommonUser}
	require.NoError(t, first.Insert(0))
	require.NoError(t, second.Insert(0))

	err := BindEmailToUser(&second, "owner+alias@outlook.com")
	require.ErrorIs(t, err, ErrEmailAlreadyTaken)

	var claim ExternalIdentityClaim
	require.NoError(t, DB.Where("provider = ? AND user_id = ?", ExternalIdentityProviderEmailCanonical, second.Id).First(&claim).Error)
	assert.Equal(t, "second@outlook.com", claim.Subject)

	stored, err := GetUserById(second.Id, true)
	require.NoError(t, err)
	assert.Equal(t, "second@outlook.com", stored.Email)
}

func TestCreateRegisteredUserRollsBackUserAndEventTogether(t *testing.T) {
	resetEmailIdentityTables(t)
	resetIPBanTables(t)

	createErr := errors.New("create failed")
	err := CreateRegisteredUser("192.0.2.40", "password", func(tx *gorm.DB) (int, error) {
		user := User{Username: "guard-rollback", Password: "password123", Role: common.RoleCommonUser}
		require.NoError(t, user.InsertWithTx(tx, 0))
		return user.Id, createErr
	})
	require.ErrorIs(t, err, createErr)

	var userCount int64
	require.NoError(t, DB.Unscoped().Model(&User{}).Where("username = ?", "guard-rollback").Count(&userCount).Error)
	assert.Zero(t, userCount)
	var eventCount int64
	require.NoError(t, DB.Model(&RegistrationIPEvent{}).Count(&eventCount).Error)
	assert.Zero(t, eventCount)
}
