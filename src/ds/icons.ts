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
export { ArrowBendUpLeftIcon as ArrowBendUpLeft } from 'phosphor-react-native/lib/commonjs/icons/ArrowBendUpLeft';
export { ArrowClockwiseIcon as ArrowClockwise } from 'phosphor-react-native/lib/commonjs/icons/ArrowClockwise';
export { ArrowCounterClockwiseIcon as ArrowCounterClockwise } from 'phosphor-react-native/lib/commonjs/icons/ArrowCounterClockwise';
export { ArrowFatUpIcon as ArrowFatUp } from 'phosphor-react-native/lib/commonjs/icons/ArrowFatUp';
export { ArrowRightIcon as ArrowRight } from 'phosphor-react-native/lib/commonjs/icons/ArrowRight';
export { ArrowSquareOutIcon as ArrowSquareOut } from 'phosphor-react-native/lib/commonjs/icons/ArrowSquareOut';
export { ArrowUpIcon as ArrowUp } from 'phosphor-react-native/lib/commonjs/icons/ArrowUp';
export { ArticleIcon as Article } from 'phosphor-react-native/lib/commonjs/icons/Article';
export { BellIcon as Bell } from 'phosphor-react-native/lib/commonjs/icons/Bell';
export { BookOpenIcon as BookOpen } from 'phosphor-react-native/lib/commonjs/icons/BookOpen';
export { BookmarkSimpleIcon as BookmarkSimple } from 'phosphor-react-native/lib/commonjs/icons/BookmarkSimple';
export { BriefcaseIcon as Briefcase } from 'phosphor-react-native/lib/commonjs/icons/Briefcase';
export { CurrencyCircleDollarIcon as CurrencyCircleDollar } from 'phosphor-react-native/lib/commonjs/icons/CurrencyCircleDollar';
export { CalendarDotsIcon as CalendarDots } from 'phosphor-react-native/lib/commonjs/icons/CalendarDots';
export { CaretDownIcon as CaretDown } from 'phosphor-react-native/lib/commonjs/icons/CaretDown';
export { CaretLeftIcon as CaretLeft } from 'phosphor-react-native/lib/commonjs/icons/CaretLeft';
export { ChartBarIcon as ChartBar } from 'phosphor-react-native/lib/commonjs/icons/ChartBar';
export { ChatCircleIcon as ChatCircle } from 'phosphor-react-native/lib/commonjs/icons/ChatCircle';
export { ChatCircleDotsIcon as ChatCircleDots } from 'phosphor-react-native/lib/commonjs/icons/ChatCircleDots';
export { CheckIcon as Check } from 'phosphor-react-native/lib/commonjs/icons/Check';
export { CheckCircleIcon as CheckCircle } from 'phosphor-react-native/lib/commonjs/icons/CheckCircle';
export { DotsThreeOutlineIcon as DotsThreeOutline } from 'phosphor-react-native/lib/commonjs/icons/DotsThreeOutline';
export { DownloadSimpleIcon as DownloadSimple } from 'phosphor-react-native/lib/commonjs/icons/DownloadSimple';
export { FileTextIcon as FileText } from 'phosphor-react-native/lib/commonjs/icons/FileText';
export { FileXlsIcon as FileXls } from 'phosphor-react-native/lib/commonjs/icons/FileXls';
export { HouseIcon as House } from 'phosphor-react-native/lib/commonjs/icons/House';
export { MagnifyingGlassIcon as MagnifyingGlass } from 'phosphor-react-native/lib/commonjs/icons/MagnifyingGlass';
export { MapPinIcon as MapPin } from 'phosphor-react-native/lib/commonjs/icons/MapPin';
export { MegaphoneIcon as Megaphone } from 'phosphor-react-native/lib/commonjs/icons/Megaphone';
export { MoonIcon as Moon } from 'phosphor-react-native/lib/commonjs/icons/Moon';
export { PaperPlaneTiltIcon as PaperPlaneTilt } from 'phosphor-react-native/lib/commonjs/icons/PaperPlaneTilt';
export { PaperclipIcon as Paperclip } from 'phosphor-react-native/lib/commonjs/icons/Paperclip';
export { PauseIcon as Pause } from 'phosphor-react-native/lib/commonjs/icons/Pause';
export { PlayIcon as Play } from 'phosphor-react-native/lib/commonjs/icons/Play';
export { PlusIcon as Plus } from 'phosphor-react-native/lib/commonjs/icons/Plus';
export { ShareFatIcon as ShareFat } from 'phosphor-react-native/lib/commonjs/icons/ShareFat';
export { SlidersHorizontalIcon as SlidersHorizontal } from 'phosphor-react-native/lib/commonjs/icons/SlidersHorizontal';
export { SunIcon as Sun } from 'phosphor-react-native/lib/commonjs/icons/Sun';
export { UsersThreeIcon as UsersThree } from 'phosphor-react-native/lib/commonjs/icons/UsersThree';
export { XIcon as X } from 'phosphor-react-native/lib/commonjs/icons/X';

export type { Icon } from 'phosphor-react-native';
