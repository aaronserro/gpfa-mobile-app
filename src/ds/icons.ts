/**
 * Phosphor icons used by the design, imported one module at a time.
 *
 * `import { House } from 'phosphor-react-native'` pulls the package's barrel
 * index, which re-exports all ~1500 icons and inflates the bundle by ~7MB.
 * Each icon is its own module, so importing them directly keeps only what the
 * screens actually render. This file is the single place that reaches into the
 * package's build output — if a version bump moves it, fix it here and in the
 * `paths` mapping in tsconfig.json that points at its declarations.
 *
 * The bare names (`House`) are deprecated upstream in favour of the `*Icon`
 * suffix, so the suffixed exports are aliased back to the short names here.
 */
export { ArrowRightIcon as ArrowRight } from 'phosphor-react-native/lib/commonjs/icons/ArrowRight';
export { ArrowUpIcon as ArrowUp } from 'phosphor-react-native/lib/commonjs/icons/ArrowUp';
export { CaretLeftIcon as CaretLeft } from 'phosphor-react-native/lib/commonjs/icons/CaretLeft';
export { ChartBarIcon as ChartBar } from 'phosphor-react-native/lib/commonjs/icons/ChartBar';
export { ChatCircleIcon as ChatCircle } from 'phosphor-react-native/lib/commonjs/icons/ChatCircle';
export { ChatCircleDotsIcon as ChatCircleDots } from 'phosphor-react-native/lib/commonjs/icons/ChatCircleDots';
export { CheckCircleIcon as CheckCircle } from 'phosphor-react-native/lib/commonjs/icons/CheckCircle';
export { DownloadSimpleIcon as DownloadSimple } from 'phosphor-react-native/lib/commonjs/icons/DownloadSimple';
export { FileTextIcon as FileText } from 'phosphor-react-native/lib/commonjs/icons/FileText';
export { FileXlsIcon as FileXls } from 'phosphor-react-native/lib/commonjs/icons/FileXls';
export { HouseIcon as House } from 'phosphor-react-native/lib/commonjs/icons/House';
export { MoonIcon as Moon } from 'phosphor-react-native/lib/commonjs/icons/Moon';
export { PaperclipIcon as Paperclip } from 'phosphor-react-native/lib/commonjs/icons/Paperclip';
export { SunIcon as Sun } from 'phosphor-react-native/lib/commonjs/icons/Sun';
export { UsersThreeIcon as UsersThree } from 'phosphor-react-native/lib/commonjs/icons/UsersThree';

export type { Icon } from 'phosphor-react-native';
