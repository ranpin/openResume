import React from 'react';
import {
  AlertTriangle,
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowUp,
  Award,
  BarChart3,
  Bold,
  BookOpen,
  Briefcase,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  Code,
  Cpu,
  Download,
  ExternalLink,
  Eye,
  File,
  FileInput,
  FileText,
  FolderOpen,
  Gamepad2,
  Github,
  GraduationCap,
  Heart,
  HelpCircle,
  Home,
  Image as ImageIcon,
  Italic,
  Languages,
  Layers,
  Lightbulb,
  Link2,
  Linkedin,
  List,
  ListOrdered,
  Loader2,
  Mail,
  MapPin,
  Maximize2,
  MessageSquare,
  Minimize2,
  Move,
  Network,
  Palette,
  Pencil,
  PenTool,
  Phone,
  Plus,
  Printer,
  Quote,
  Redo2,
  RotateCcw,
  Rss,
  Save,
  Search,
  Send,
  Settings,
  Settings2,
  Share2,
  ShieldCheck,
  Sparkles,
  Star,
  Strikethrough,
  Tag,
  Trash2,
  Trophy,
  Type,
  Underline,
  Undo2,
  User,
  Users,
  Wand2,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react';

/**
 * 轻量图标封装：以 lucide-react 的 SVG 图标替代 Font Awesome。
 * 图标以 1em 尺寸渲染，因此沿用原有的 `text-*` 字号 / 颜色类即可，
 * 视觉表现与 `<i className="fas fa-xxx">` 基本一致。
 *
 * 用法：<Icon name="home" className="text-blue-500 mr-2" />
 */

// 原 Font Awesome 名称（去掉 fa- 前缀）到 lucide 组件的映射
const ICON_MAP: Record<string, LucideIcon> = {
  'align-center': AlignCenter,
  'align-left': AlignLeft,
  'align-right': AlignRight,
  'arrow-down': ArrowDown,
  'arrow-up': ArrowUp,
  'arrows-alt': Move,
  bold: Bold,
  bolt: Zap,
  book: BookOpen,
  briefcase: Briefcase,
  'calendar-alt': Calendar,
  'certificate': Award,
  'chart-bar': BarChart3,
  'chart-network': Network,
  check: Check,
  'chevron-down': ChevronDown,
  'chevron-right': ChevronRight,
  code: Code,
  cog: Settings,
  cogs: Settings2,
  comments: MessageSquare,
  compress: Minimize2,
  download: Download,
  edit: Pencil,
  envelope: Mail,
  'exclamation-triangle': AlertTriangle,
  expand: Maximize2,
  'external-link-alt': ExternalLink,
  eye: Eye,
  file: File,
  'file-alt': FileText,
  'file-import': FileInput,
  'file-pdf': FileText,
  'folder-open': FolderOpen,
  gamepad: Gamepad2,
  github: Github,
  'graduation-cap': GraduationCap,
  heart: Heart,
  home: Home,
  image: ImageIcon,
  italic: Italic,
  'language': Languages,
  'layer-group': Layers,
  lightbulb: Lightbulb,
  link: Link2,
  linkedin: Linkedin,
  'list-ol': ListOrdered,
  'list-ul': List,
  magic: Wand2,
  'map-marker-alt': MapPin,
  microchip: Cpu,
  palette: Palette,
  'paper-plane': Send,
  'pen-fancy': PenTool,
  phone: Phone,
  plus: Plus,
  print: Printer,
  'quote-right': Quote,
  redo: RotateCcw,
  redo2: Redo2,
  rss: Rss,
  save: Save,
  search: Search,
  'share-alt': Share2,
  sparkles: Sparkles,
  spinner: Loader2,
  star: Star,
  strikethrough: Strikethrough,
  tag: Tag,
  'text-height': Type,
  times: X,
  trash: Trash2,
  trophy: Trophy,
  underline: Underline,
  undo: Undo2,
  user: User,
  'user-shield': ShieldCheck,
  users: Users,
};

interface IconProps {
  /** 图标名（原 fa- 之后的部分，如 "home"、"chevron-right"） */
  name: string;
  className?: string;
  /** 旋转动画（原 fa-spin） */
  spin?: boolean;
  'aria-label'?: string;
}

const Icon: React.FC<IconProps> = ({
  name,
  className = '',
  spin = false,
  'aria-label': ariaLabel,
}) => {
  const Cmp = ICON_MAP[name] || HelpCircle;
  return (
    <Cmp
      width="1em"
      height="1em"
      aria-hidden={ariaLabel ? undefined : true}
      aria-label={ariaLabel}
      className={`inline-block shrink-0 ${spin ? 'animate-spin' : ''} ${className}`.trim()}
    />
  );
};

export default Icon;
