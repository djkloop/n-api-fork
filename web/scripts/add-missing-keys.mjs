import fs from 'node:fs/promises'
import path from 'node:path'

const dir = path.resolve('src/i18n/locales')
const values = {
  en: { 'Click captcha': 'Click', 'Slide captcha': 'Slide', 'Drag captcha': 'Drag', 'Rotate captcha': 'Rotate', 'Challenge completed. It will be verified when you submit.': 'Challenge completed. It will be verified when you submit.', 'Image captcha is incorrect': 'Image captcha is incorrect', 'Captcha verified successfully': 'Captcha verified successfully' },
  zh: { 'Click captcha': '点选', 'Slide captcha': '滑动', 'Drag captcha': '拖拽', 'Rotate captcha': '旋转', 'Challenge completed. It will be verified when you submit.': '验证操作已完成，提交时将进行校验。', 'Image captcha is incorrect': '图片验证码错误', 'Captcha verified successfully': '验证码验证成功' },
  'zh-TW': { 'Click captcha': '點選', 'Slide captcha': '滑動', 'Drag captcha': '拖曳', 'Rotate captcha': '旋轉', 'Challenge completed. It will be verified when you submit.': '驗證操作已完成，提交時將進行校驗。', 'Image captcha is incorrect': '圖片驗證碼錯誤', 'Captcha verified successfully': '驗證碼驗證成功' },
  fr: { 'Click captcha': 'Clic', 'Slide captcha': 'Glissement', 'Drag captcha': 'Glisser-déposer', 'Rotate captcha': 'Rotation', 'Challenge completed. It will be verified when you submit.': 'Défi terminé. Il sera vérifié lors de l’envoi.', 'Image captcha is incorrect': 'Le captcha image est incorrect', 'Captcha verified successfully': 'Captcha vérifié avec succès' },
  ja: { 'Click captcha': 'クリック', 'Slide captcha': 'スライド', 'Drag captcha': 'ドラッグ', 'Rotate captcha': '回転', 'Challenge completed. It will be verified when you submit.': 'チャレンジが完了しました。送信時に検証されます。', 'Image captcha is incorrect': '画像 CAPTCHA が正しくありません', 'Captcha verified successfully': 'CAPTCHA の検証に成功しました' },
  ru: { 'Click captcha': 'Клик', 'Slide captcha': 'Перемещение', 'Drag captcha': 'Перетаскивание', 'Rotate captcha': 'Вращение', 'Challenge completed. It will be verified when you submit.': 'Проверка выполнена. Результат будет подтверждён при отправке.', 'Image captcha is incorrect': 'Неверная графическая CAPTCHA', 'Captcha verified successfully': 'CAPTCHA успешно проверена' },
  vi: { 'Click captcha': 'Nhấp', 'Slide captcha': 'Trượt', 'Drag captcha': 'Kéo thả', 'Rotate captcha': 'Xoay', 'Challenge completed. It will be verified when you submit.': 'Thử thách đã hoàn tất. Kết quả sẽ được xác minh khi gửi.', 'Image captcha is incorrect': 'CAPTCHA hình ảnh không chính xác', 'Captcha verified successfully': 'Xác minh CAPTCHA thành công' },
}
for (const [locale, additions] of Object.entries(values)) {
  const file = path.join(dir, `${locale}.json`)
  const json = JSON.parse(await fs.readFile(file, 'utf8'))
  Object.assign(json.translation, additions)
  json.translation = Object.fromEntries(Object.entries(json.translation).sort(([a], [b]) => a.localeCompare(b)))
  await fs.writeFile(file, `${JSON.stringify(json, null, 2)}\n`)
}
