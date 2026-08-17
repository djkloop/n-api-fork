import fs from 'node:fs/promises'
import path from 'node:path'

const dir = path.resolve('src/i18n/locales')
const values = {
  en: { 'Click captcha': 'Click', 'Slide captcha': 'Slide', 'Drag captcha': 'Drag', 'Rotate captcha': 'Rotate' },
  zh: { 'Click captcha': '点选', 'Slide captcha': '滑动', 'Drag captcha': '拖拽', 'Rotate captcha': '旋转' },
  'zh-TW': { 'Click captcha': '點選', 'Slide captcha': '滑動', 'Drag captcha': '拖曳', 'Rotate captcha': '旋轉' },
  fr: { 'Click captcha': 'Clic', 'Slide captcha': 'Glissement', 'Drag captcha': 'Glisser-déposer', 'Rotate captcha': 'Rotation' },
  ja: { 'Click captcha': 'クリック', 'Slide captcha': 'スライド', 'Drag captcha': 'ドラッグ', 'Rotate captcha': '回転' },
  ru: { 'Click captcha': 'Клик', 'Slide captcha': 'Перемещение', 'Drag captcha': 'Перетаскивание', 'Rotate captcha': 'Вращение' },
  vi: { 'Click captcha': 'Nhấp', 'Slide captcha': 'Trượt', 'Drag captcha': 'Kéo thả', 'Rotate captcha': 'Xoay' },
}
for (const [locale, additions] of Object.entries(values)) {
  const file = path.join(dir, `${locale}.json`)
  const json = JSON.parse(await fs.readFile(file, 'utf8'))
  Object.assign(json.translation, additions)
  json.translation = Object.fromEntries(Object.entries(json.translation).sort(([a], [b]) => a.localeCompare(b)))
  await fs.writeFile(file, `${JSON.stringify(json, null, 2)}\n`)
}
