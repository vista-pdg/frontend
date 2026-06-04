# Portal ICESI — Design System

> Documento de referencia para replicar el design system del Portal ICESI en proyectos que usan **Tailwind CSS v4 + shadcn/ui + lucide-react + Geist Variable**.

---

## Tabla de Contenidos

1. [Tech Stack](#1-tech-stack)
2. [Colores](#2-colores)
3. [Tipografía](#3-tipografia)
4. [Iconos](#4-iconos)
5. [Border Radius](#5-border-radius)
6. [Spacing](#6-spacing)
7. [Sombras](#7-sombras)
8. [Layout](#8-layout)
9. [Z-Index](#9-z-index)
10. [Scrollbars](#10-scrollbars)
11. [Animaciones y Transiciones](#11-animaciones-y-transiciones)
12. [shadcn Component Mapping](#12-shadcn-component-mapping)
13. [Hover Utility](#13-hover-utility)
14. [Theming (Light / Dark)](#14-theming-light--dark)
15. [Integración Checklist](#15-integracion-checklist)

---

## 1. Tech Stack

### Original (ic_portal)
| Tecnología | Versión |
|---|---|
| React | 18 |
| TypeScript | ~5 |
| MUI (Material UI) | 7 |
| Emotion (styled) | 11 |
| Bootstrap 5 + Bootswatch Cosmo | 5.3 |
| FontAwesome Free Solid | 7 |
| @mui/icons-material | 7 |

### Destino (nuevo proyecto)
| Tecnología | Versión |
|---|---|
| React | 19 |
| TypeScript | 6 |
| **Tailwind CSS** | 4 |
| **shadcn/ui** | 4 |
| **lucide-react** | 1.16 |
| **Geist Variable** | (vía `@fontsource-variable/geist`) |
| tw-animate-css | 1.4 |
| class-variance-authority | 0.7 |
| clsx / tailwind-merge | ✓ |

> No se requieren dependencias adicionales.

---

## 2. Colores

### 2.1. Paleta Completa

La paleta se define en un único lugar (`app.tsx` → `sharedPalette`) y se comparte entre todos los componentes vía el tema de MUI.

| Token | Hex | Light Mode | Dark Mode | Uso principal |
|-------|-----|------------|-----------|---------------|
| **primary** | `#5454e9` | ✓ | ✓ | Botones, enlaces, header bg, scrollbar track |
| primary light | derivado | ✓ | ✓ | Hover de dots en ads |
| primary dark | derivado | ✓ | ✓ | |
| **secondary** | `#4cb979` | ✓ | ✓ | Scrollbar thumb, spinner, cards success |
| secondary dark | `#368b5b` | ✓ | ✓ | Scrollbar thumb hover |
| **black** main | `#000000` | ✓ | ✓ | Sidebar bg, header bg, meta theme-color |
| black light | `#333333` | ✓ | ✓ | |
| black dark | `#333333` | ✓ | ✓ | |
| **purple** main | `#865FF0` | ✓ | ✓ | Chip, badge |
| purple dark | `#5e3ebd` | ✓ | ✓ | |
| **orange** main | `#E9683B` | ✓ | ✓ | Balance icons, schedule now-indicator |
| orange dark | `#b44d29` | ✓ | ✓ | |
| **green** main | `#4CB979` | ✓ | ✓ | (mismo hex que secondary) |
| green dark | `#368b5b` | ✓ | ✓ | |
| **yellow** main | `#E4EB60` | ✓ | ✓ | Menú seleccionado, scrollbar, schedule active |
| yellow dark | `#b0b93b` | ✓ | ✓ | Hover de menú seleccionado |
| **surface** (bg default) | `#E5E5F5` | Solo light | — | Fondo de página, action hover |
| **link** | `#533f03` | ✓ | ✓ | Enlaces en contenido (app.scss legacy) |

### 2.2. Colores Semánticos (Grade / Status)

| Uso | Hex | Origen |
|-----|-----|--------|
| Approved / ≥ 4.0 | `#2e7d32` | `color-utils.ts` |
| Warning / ≥ 3.0 | `#ed6c02` | `color-utils.ts` |
| Failed / < 3.0 | `#d32f2f` | `color-utils.ts` |

### 2.3. Configuración Tailwind v4

```css
/* src/index.css */
@import "tailwindcss";
@import "tw-animate-css";

@theme {
  --color-primary: #5454e9;
  --color-primary-light: #7a7aee;
  --color-primary-dark: #4343ba;

  --color-secondary: #4cb979;
  --color-secondary-dark: #368b5b;

  --color-black-main: #000000;
  --color-black-light: #333333;
  --color-black-dark: #333333;

  --color-purple-main: #865FF0;
  --color-purple-dark: #5e3ebd;

  --color-orange-main: #E9683B;
  --color-orange-dark: #b44d29;

  --color-green-main: #4CB979;
  --color-green-dark: #368b5b;

  --color-yellow-main: #E4EB60;
  --color-yellow-dark: #b0b93b;

  --color-surface: #E5E5F5;
  --color-link: #533f03;

  --color-success: #2e7d32;
  --color-warning: #ed6c02;
  --color-error: #d32f2f;
}
```

### 2.4. Variables shadcn/ui

En el archivo `src/app/globals.css` (o el que genere shadcn al hacer `init`):

```css
@layer base {
  :root {
    --background: #E5E5F5;
    --foreground: #000000;
    --card: #ffffff;
    --card-foreground: #000000;
    --popover: #ffffff;
    --popover-foreground: #000000;
    --primary: #5454e9;
    --primary-foreground: #ffffff;
    --secondary: #4cb979;
    --secondary-foreground: #ffffff;
    --muted: #E5E5F5;
    --muted-foreground: #333333;
    --accent: #E5E5F5;
    --accent-foreground: #000000;
    --destructive: #d32f2f;
    --destructive-foreground: #ffffff;
    --border: #e0e0e0;
    --input: #e0e0e0;
    --ring: #5454e9;
    --radius: 0;
  }

  .dark {
    --background: #121212;
    --foreground: #ffffff;
    --card: #1e1e1e;
    --card-foreground: #ffffff;
    --popover: #1e1e1e;
    --popover-foreground: #ffffff;
    --primary: #5454e9;
    --primary-foreground: #ffffff;
    --secondary: #4cb979;
    --secondary-foreground: #ffffff;
    --muted: #2a2a2a;
    --muted-foreground: #a0a0a0;
    --accent: #2a2a2a;
    --accent-foreground: #ffffff;
    --destructive: #d32f2f;
    --destructive-foreground: #ffffff;
    --border: #333333;
    --input: #333333;
    --ring: #5454e9;
  }
}
```

---

## 3. Tipografia

### 3.1. Font Family

| Propiedad | Valor | Origen |
|---|---|---|
| Font primaria | `'Geist Variable', sans-serif` | `app.tsx` (original: `Plus Jakarta Sans`) |
| Import | `@fontsource-variable/geist` | `package.json` |
| Toastify font | Misma font family | `app.tsx:212` |

### 3.2. Escala Fluid (clamp)

El proyecto original usa un sistema **fluido** con `clamp()`. Estos son los valores típicos:

| Contexto | clamp() | Tailwind sugerida |
|----------|---------|-------------------|
| Calendar buttons / titles | `clamp(0.7rem, 3vw, 0.775rem)` | `text-[clamp(0.7rem,3vw,0.775rem)]` |
| Calendar event time / table | `clamp(0.625rem, 3vw, 0.75rem)` | `text-[clamp(0.625rem,3vw,0.75rem)]` |
| Event title | `clamp(0.5rem, 2.5vw, 0.75rem)` | `text-[clamp(0.5rem,2.5vw,0.75rem)]` |
| Classroom label | `clamp(0.375rem, 2vw, 0.5rem)` | `text-[clamp(0.375rem,2vw,0.5rem)]` |
| Course row items (body) | `clamp(0.675rem, 0.75vw, 0.75rem)` | `text-[clamp(0.675rem,0.75vw,0.75rem)]` |
| Course row title | `clamp(0.875rem, 1vw, 1rem)` | `text-[clamp(0.875rem,1vw,1rem)]` |
| Menu primary text | `clamp(0.875rem, 1vw, 1rem)` | `text-[clamp(0.875rem,1vw,1rem)]` |
| Course detail text | `clamp(0.75rem, 1vw, 0.875rem)` | `text-[clamp(0.75rem,1vw,0.875rem)]` |
| Course components icon | `clamp(1rem, 1vw, 1.125rem)` | `text-[clamp(1rem,1vw,1.125rem)]` |
| Retention / Caption | `clamp(0.675rem, 0.75vw, 0.75rem)` | `text-[clamp(0.675rem,0.75vw,0.75rem)]` |
| Retention / Body | `clamp(0.875rem, 1vw, 1rem)` | `text-[clamp(0.875rem,1vw,1rem)]` |

### 3.3. Font Weights

| Peso | Uso |
|------|-----|
| 400 (normal) | Texto base, ribbon link |
| 500 (medium) | Subtítulos, items de lista |
| 600 (semibold) | Balance amounts, título de curso, botón activo |
| 700 (bold) | Headers, labels, enlaces |
| 800 (extrabold) | Footer títulos |

### 3.4. Variantes MUI → HTML/Tailwind

| Variante MUI | Elemento HTML | Clase Tailwind sugerida |
|---|---|---|
| `h5` | `<h5>` | `text-lg font-bold` |
| `h6` | `<h6>` | `text-base font-bold` |
| `subtitle1` | `<p>` | `text-sm font-semibold` |
| `body1` | `<p>` | `text-sm` |
| `body2` | `<p>` | `text-xs` |
| `caption` | `<span>` | `text-[clamp(0.675rem,0.75vw,0.75rem)]` |

### 3.5. Instalación Geist

```ts
// src/main.tsx — importar una vez al inicio
import '@fontsource-variable/geist';
```

No requiere configuración adicional. Tailwind lo usa por defecto al ser la primera fuente en el `fontFamily`.

---

## 4. Iconos

### 4.1. Estrategia

El proyecto original tiene **tres fuentes** de iconos:

| Fuente | Original | Reemplazo |
|--------|----------|-----------|
| **FontAwesome** (~33 iconos) | `@fortawesome/free-solid-svg-icons` | `lucide-react` |
| **@mui/icons-material** (~12 iconos) | `@mui/icons-material` | `lucide-react` |
| **SVG custom** (~40 iconos) | `icons-loader.tsx` (SvgIcon) | `lucide-react` |
| **Social media** (7 iconos) | `footer-utils.tsx` (SVG inline) | Mantener SVG inline |

### 4.2. Mapping: SVG Custom → lucide-react

| Nombre original | Uso | lucide equivalente |
|---|---|---|
| `HomeIcon` | Menú inicio | `<House />` |
| `EstudianteIcon` | Menú estudiante | `<GraduationCap />` |
| `AspiranteIcon` | Menú aspirante | `<UserPlus />` |
| `ProfesorIcon` | Menú profesor | `<Presentation />` |
| `ColaboradorIcon` | Menú colaborador | `<Users />` |
| `LogoutIcon` | Cerrar sesión | `<LogOut />` |
| `CheckCircleIcon` | Success card | `<CheckCircle />` |
| `ErrorIcon` | Error card / balance | `<AlertCircle />` |
| `WalletIcon` | Balance | `<Wallet />` |
| `SubjectIcon` | Materias | `<BookOpen />` |
| `ArrowDownIcon` | Expandir | `<ChevronDown />` |
| `ArrowUpIcon` | Colapsar | `<ChevronUp />` |
| `ArrowLeftIcon` | Navegación | `<ChevronLeft />` |
| `ArrowRightIcon` | Navegación | `<ChevronRight />` |
| `RetentionIcon` | Retención | `<BarChart3 />` |
| `MapIcon` | Mapa | `<Map />` |
| `ArrowPrevIcon` | Carrusel anterior | `<ChevronLeft />` |
| `ArrowNextIcon` | Carrusel siguiente | `<ChevronRight />` |
| `MegaphoneIcon` | Anuncios | `<Megaphone />` |
| `PinIcon` | Pin anuncio | `<MapPin />` |
| `ConfigIcon` | Configuración | `<Settings />` |
| `CalendarIcon` | Calendario | `<Calendar />` |
| `ContactIcon` | Contacto | `<PhoneCall />` |
| `EmailIcon` | Email | `<Mail />` |
| `PhoneIcon` | Teléfono | `<Phone />` |
| `ClockIcon` | Horario | `<Clock />` |
| `EditIcon` | Editar | `<Pencil />` |
| `InfoIcon` | Información | `<Info />` |
| `FilterIcon` | Filtrar | `<Filter />` |
| `FilterOffIcon` | Quitar filtro | `<FilterX />` |
| `SearchOffIcon` | Sin resultados | `<SearchX />` |
| `CheckIcon` | Check | `<Check />` |
| `CloseIcon` | Cerrar | `<X />` |
| `OpenInNewIcon` | Abrir en nueva pestaña | `<ExternalLink />` |
| `LinkIcon` | Enlace | `<Link />` |
| `AutoStoriesIcon` | Gestión cursos | `<BookOpen />` |
| `LocalLibraryIcon` | Recursos pedagógicos | `<Library />` |
| `StarIcon` | Calificación | `<Star />` |
| `KeyIcon` | Evento detalle (aula) | `<Key />` |
| `AnalyticsIcon` | Analítica | `<BarChart />` |
| `VitalSignsIcon` | Signos vitales | `<Activity />` |
| `SettingsIcon` | Ajustes | `<Settings />` |
| `ListAltIcon` | Lista | `<List />` |
| `DescriptionIcon` | Documento | `<FileText />` |
| `AdminPanelSettingsIcon` | Admin | `<Shield />` |
| `TranslateIcon` | Idioma | `<Languages />` |
| `EditSquareIcon` | Editar cuadrado | `<SquarePen />` |
| `DesktopWindowsIcon` | Escritorio | `<Monitor />` |
| `LightModeIcon` | Modo claro | `<Sun />` |
| `DarkModeIcon` | Modo oscuro | `<Moon />` |
| `RoutineIcon` | Automático | `<MonitorSmartphone />` |
| `ComputerIcon` | Computador | `<Monitor />` |
| `PersonIcon` | Persona | `<User />` |
| `TodayIcon` | Hoy | `<CalendarDays />` |
| `ArticleIcon` | Artículo | `<Newspaper />` |
| `OutlookIcon` | Outlook | SVG inline (logo) |
| `GmailIcon` | Gmail | SVG inline (logo) |

### 4.3. Mapping: FontAwesome → lucide-react

| FontAwesome | lucide equivalente |
|---|---|
| `faArrowLeft` | `<ArrowLeft />` |
| `faAsterisk` | `<Asterisk />` |
| `faBan` | `<Ban />` |
| `faBell` | `<Bell />` |
| `faBook` | `<Book />` |
| `faCloud` | `<Cloud />` |
| `faCogs` | `<Settings />` |
| `faDatabase` | `<Database />` |
| `faEye` | `<Eye />` |
| `faFlag` | `<Flag />` |
| `faHeart` | `<Heart />` |
| `faHome` | `<House />` |
| `faList` | `<List />` |
| `faLock` | `<Lock />` |
| `faPencilAlt` | `<Pencil />` |
| `faPlus` | `<Plus />` |
| `faRoad` | `<Route />` |
| `faSave` | `<Save />` |
| `faSearch` | `<Search />` |
| `faSignInAlt` | `<LogIn />` |
| `faSignOutAlt` | `<LogOut />` |
| `faSort` | `<ArrowUpDown />` |
| `faSync` | `<RefreshCw />` |
| `faTachometerAlt` | `<Gauge />` |
| `faTasks` | `<CheckSquare />` |
| `faThList` | `<ListOrdered />` |
| `faTimesCircle` | `<XCircle />` |
| `faTrash` | `<Trash2 />` |
| `faUser` | `<User />` |
| `faUserPlus` | `<UserPlus />` |
| `faUsers` | `<Users />` |
| `faUsersCog` | `<Users />` |
| `faWrench` | `<Wrench />` |

### 4.4. Mapping: MUI Icons → lucide-react

| MUI Icon | lucide equivalente |
|---|---|
| `ExpandMore` | `<ChevronDown />` |
| `CloseOutlined` | `<X />` |
| `RestartAltOutlined` | `<RefreshCcw />` |
| `SaveOutlined` | `<Save />` |
| `DragIndicator` | `<GripVertical />` |
| `MenuIcon` | `<Menu />` |
| `VisibilityOffIcon` | `<EyeOff />` |
| `SendIcon` | `<Send />` |

### 4.5. Iconos Sociales (Footer)

Mantener como `<svg>` inline en un archivo `social-icons.tsx`. Son 7 iconos:

| Red | Archivo SVG origen |
|-----|-------------------|
| Facebook | `footer-utils.tsx:6-18` |
| X (Twitter) | `footer-utils.tsx:23-42` |
| YouTube | `footer-utils.tsx:47-59` |
| Instagram | `footer-utils.tsx:63-77` |
| Flickr | `footer-utils.tsx:81-105` |
| LinkedIn | `footer-utils.tsx:109-121` |
| TikTok | `footer-utils.tsx:126-138` |

### 4.6. Logos ICESI (SVG files)

| Archivo | Uso |
|---|---|
| `content/images/logo-icesi.svg` | Header (light mode) |
| `content/images/icon-icesi.svg` | Header icon |
| `content/images/logo-icesi-color.svg` | Footer / Header (dark mode) |
| `content/images/icon-icesi-color.svg` | Favicon / loading |

Estos archivos están en `src/main/webapp/content/images/`. Copiarlos al proyecto destino en `public/images/`.

---

## 5. Border Radius

### 5.1. Regla General

El diseño original usa **border-radius: 0** en casi todos los componentes:

| Componente | Radius | Origen |
|---|---|---|
| **Global** — Paper, Card | `0` | `app.tsx:152` — `MuiPaper` override |
| **Global** — Inputs | `0` | `app.tsx:159` — `MuiOutlinedInput` override |
| **Global** — Buttons | `0` | `app.tsx:166` — `MuiButton` override |
| **Toast** | `0` | `app.tsx:211` — `--toastify-toast-bd-radius` |
| **Calendar buttons** | `0` | `schedule-styles.ts:29` |
| **Calendar events** | `0` | `schedule-styles.ts:121` |
| **Chip / Badge** | `0` | `retention.tsx:35`, `balance.tsx:42` |
| **Retention detail** | `0` | `retention-detail.tsx:39` |

### 5.2. Excepciones

| Elemento | Radius | Uso |
|----------|--------|-----|
| Badge circular | `50%` | `course-components.tsx:102` |
| Icon container footer | `50%` | `footer-components.tsx:74` |
| `.shadow` class legacy | `2px` | `app.scss:112` |
| Password strength point | `2px` | `password-strength-bar.scss:14` |

### 5.3. Tailwind config

```css
/* Ya definido en las variables shadcn */
--radius: 0;

/* Excepciones se aplican inline */
rounded-full  /* 50% */
rounded-sm    /* 2px */
```

---

## 6. Spacing

### 6.1. MUI Spacing → Tailwind

MUI usa una escala base de 8px. Tailwind usa la misma escala por defecto.

| MUI spacing | px | Tailwind |
|---|---|---|
| `spacing(0.5)` | 4px | `p-0.5` / `gap-0.5` |
| `spacing(1)` | 8px | `p-1` / `gap-1` |
| `spacing(1.5)` | 12px | `p-1.5` / `gap-1.5` |
| `spacing(2)` | 16px | `p-2` / `gap-2` |
| `spacing(3)` | 24px | `p-3` / `gap-3` |
| `spacing(4)` | 32px | `p-4` / `gap-4` |
| `spacing(5)` | 40px | `p-5` / `gap-5` |
| `spacing(13)` | 104px | `p-13` |
| `spacing(22)` | 176px | `p-22` |

### 6.2. Valores típicos usados en el proyecto

| Uso | Valor | Expresión |
|---|---|---|
| Padding contenedor principal | 16px / 32px (responsive) | `p-2 sm:p-4` |
| Padding menu item | 24px left | `pl-3` |
| Gap entre items | 8px / 16px | `gap-1` / `gap-2` |
| Gap sidebar | 40px | `gap-5` |
| Margin bottom secciones | 8px – 16px | `mb-1` / `mb-2` |
| Sidebar user info gap | 12px | `gap-1.5` |

### 6.3. Utility Classes Legacy (reemplazo)

El original tiene clases SCSS generadas. Reemplazar con Tailwind:

| Clase original | Tailwind equivalente |
|---|---|
| `.pad-10` | `p-10` |
| `.pad-top-20` | `pt-20` |
| `.no-padding` | `p-0` |
| `.no-padding-left` | `pl-0` |
| `.voffset-10` | `mt-10` |
| `.voffset-30` | `mt-30` |
| `.no-margin` | `m-0` |

---

## 7. Sombras

### 7.1. Valores

| Nivel | Valor | Uso |
|---|---|---|
| `shadow-none` | `none` | AppBar, focus states, Accordion |
| `shadow-sm` | MUI `shadows[1]` | Calendar buttons |
| `shadow-md` | MUI `shadows[3]` | Event content cards |
| **Custom shadow** | `rgba(0,0,0,0.12) 0 1px 6px, rgba(0,0,0,0.12) 0 1px 4px` | Clase `.shadow` legacy |

```css
/* Si se necesita la shadow custom */
@theme {
  --shadow-custom: 0 1px 6px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.12);
}
```

---

## 8. Layout

### 8.1. Sidebar (Drawer)

| Propiedad | Valor | Notas |
|---|---|---|
| Ancho colapsado | `84px` | Solo iconos visibles |
| Ancho expandido | `250px` | Muestra icono + texto |
| Background | `black.main` (`#000000`) | |
| Padding vertical | `py-5` | |
| Gap entre secciones | `gap-5` | |
| Hover para expandir | `:hover { width: 250px }` | Solo desktop sin touch |
| Mobile | `temporary` drawer | Usar shadcn `<Sheet />` |

### 8.2. Header (AppBar)

| Propiedad | Valor |
|---|---|
| Altura | `90px` |
| Background | `black.main` (`#000000`) |
| Position | `fixed` |
| Display | Solo en mobile (md: flex, desktop: none) |
| Z-index | `drawer + 1` |

### 8.3. Development Ribbon

Banda roja diagonal solo en entorno dev:

```css
.ribbon {
  background: rgba(170, 0, 0, 0.5);
  transform: rotate(-45deg);
  position: fixed;
  top: 40px;
  z-index: 99999;
  width: 15em;
}
```

### 8.4. Loading Bar

```css
.loading-bar {
  height: 3px;
  background: #009cd8;
  position: absolute;
  top: 0;
  z-index: 1031;
}
```

### 8.5. Main Content Container

| Propiedad | Valor |
|---|---|
| Padding | `p-2 sm:p-4` |
| Background top bar | `primary.main` (`#5454e9`), height `200px`, posición absoluta, `z-index: -1` |
| Min height | `100vh - paddingTop` (mobile) o `100vh` (desktop) |

### 8.6. Grid Layout (Audiencias)

El layout principal usa 12 columnas:

```
cols = { xl: 12, lg: 12, md: 12, sm: 12, xs: 12 }
```

### 8.7. Breakpoints

| Breakpoint | Tailwind | MUI |
|---|---|---|
| xs | `max-w-sm` (640px) | 0–600px |
| sm | `sm:` (640px) | 600px |
| md | `md:` (768px) | 900px |
| lg | `lg:` (1024px) | 1200px |
| xl | `xl:` (1280px) | 1536px |

El breakpoint más usado es `md` (768px) para separar mobile y desktop.

---

## 9. Z-Index

| Elemento | Valor |
|---|---|
| Loading overlay | `9999999999` |
| Dev ribbon | `99999` |
| Loading bar | `1031` |
| Fullscreen modal | `1000` |
| Header (mobile) | `theme.zIndex.drawer + 1` (~1201) |
| FullCalendar list day | `1` |
| Background color container | `-1` |

---

## 10. Scrollbars

### 10.1. Global (app.tsx)

```css
/* Firefox */
.scrollbar-thin {
  scrollbar-width: thin;
  scrollbar-color: #4cb979 #E5E5F5;
}

/* Webkit */
.scrollbar-custom::-webkit-scrollbar {
  width: 5px;
  height: 5px;
}
.scrollbar-custom::-webkit-scrollbar-thumb {
  background-color: #4cb979;        /* secondary.main */
}
.scrollbar-custom::-webkit-scrollbar-thumb:hover {
  background-color: #368b5b;        /* secondary.dark */
}
.scrollbar-custom::-webkit-scrollbar-track {
  background-color: #E5E5F5;        /* background.default */
}
```

### 10.2. Sidebar Scrollbar

Usa `yellow` en vez de `secondary`:

```css
/* Firefox */
scrollbar-color: #E4EB60 #E5E5F5;  /* yellow.main + background.default */

/* Webkit */
::-webkit-scrollbar-thumb {
  background-color: #E4EB60;        /* yellow.main */
}
::-webkit-scrollbar-thumb:hover {
  background-color: #b0b93b;        /* yellow.dark */
}
```

---

## 11. Animaciones y Transiciones

### 11.1. Loading Spinner (Logo rotation)

```css
@keyframes spin-logo {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

.logo-spin {
  animation: spin-logo 2.5s linear infinite;
}
```

Ya incluido en `tw-animate-css`: usar clase `animate-spin`.

### 11.2. Sidebar Width Transition

```css
.sidebar-transition {
  transition: width 300ms cubic-bezier(0.4, 0, 0.6, 1);
}
```

Equivalente Tailwind: `transition-all duration-300 ease-in-out`.

### 11.3. Menu Item Color Transition

```css
.menu-item {
  transition: color 150ms, background-color 150ms;
}
```

Tailwind: `transition-colors duration-150`.

### 11.4. Menu Item Arrow Rotation

```css
.arrow-open { transform: rotate(180deg); }
.arrow-closed { transform: rotate(0deg); }
.arrow-transition { transition: transform 0.3s; }
```

### 11.5. Ad Dot Hover

```css
.ad-dot {
  transition: background-color 0.2s ease-in-out;
}
```

### 11.6. Hover States (pointer-fine vs pointer-coarse)

Ver sección [Hover Utility](#13-hover-utility).

---

## 12. shadcn Component Mapping

| Componente MUI original | Componente shadcn/ui |
|---|---|
| `AppBar` + `Toolbar` | Header `<header>` HTML + estilos custom |
| `Drawer` | `Sheet` (mobile) / `<aside>` custom (desktop) |
| `Paper` / `Card` | `Card` (`CardHeader`, `CardContent`, `CardFooter`) |
| `Button` | `Button` |
| `IconButton` | `Button variant="ghost" size="icon"` |
| `Typography` | Elementos HTML (`<h1>`–`<h6>`, `<p>`, `<span>`) + clases |
| `OutlinedInput` | `Input` |
| `TextField` | `Input` + `Label` |
| `Dialog` | `Dialog` |
| `Chip` | `Badge` |
| `Avatar` | `Avatar` |
| `CircularProgress` | `<Loader2 className="animate-spin" />` |
| `Snackbar` / `Toast` | `Toast` (sonner / shadcn toast) |
| `Tabs` | `Tabs` |
| `Accordion` | `Accordion` |
| `Collapse` | animación CSS + `AnimatePresence` (framer motion) o estado `hidden` |
| `List` / `ListItem` | `<ul>` / `<li>` + `cn()` |
| `ListSubheader` | `<h3>` + estilos |
| `Container` | `<div className="container">` |
| `Grid` | CSS Grid (`grid grid-cols-12`) o flex |
| `Divider` | `<Separator />` o `<hr />` |
| `Tooltip` | `Tooltip` |
| `Skeleton` | `Skeleton` |
| `Switch` | `Switch` |
| `Slider` | `Slider` |
| `Checkbox` | `Checkbox` |
| `Radio` | `RadioGroup` |
| `Select` | `Select` |
| `Alert` | `Alert` |
| `Breadcrumbs` | `Breadcrumb` |
| `SpeedDial` | FAB + Dropdown menu |
| `Rating` | Estrellas manuales + estado |
| `FullCalendar` | `@fullcalendar/react` (mantener igual) |

---

## 13. Hover Utility

El proyecto original tiene un `hoverStyles()` que maneja estados hover diferenciados por tipo de dispositivo:

```ts
// Comportamiento original:
// - @media (pointer: fine)   → :hover
// - @media (pointer: coarse) → :active
// - background-color default: theme.palette.background.paper
// - background-color hover:   theme.palette.action.hover
```

### Equivalente en Tailwind

```css
@layer utilities {
  /* Hover para mouse */
  @media (pointer: fine) {
    .hover-surface:hover {
      background-color: #E5E5F5;
    }
  }
  /* Hover para touch (reemplazar hover por active) */
  @media (pointer: coarse) {
    .hover-surface:active {
      background-color: #E5E5F5;
    }
  }
}
```

Usar como `className="hover-surface transition-colors duration-150"`.

---

## 14. Theming (Light / Dark)

### 14.1. Estrategia

Usar el sistema de clases `dark:` de Tailwind + el selector `.dark` para el modo oscuro.

### 14.2. Activación

```tsx
// En el provider de tema (ThemeProvider o similar)
const [theme, setTheme] = useState<'light' | 'dark'>('light');

useEffect(() => {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}, [theme]);
```

Seguir 3 modos como el original:
- **Light mode** (sol)
- **Dark mode** (luna)
- **System** (monitor) — usar `prefers-color-scheme`

### 14.3. CSS

Las variables ya están definidas en la sección [2.4](#24-variables-shadcnui). Usar `dark:` para variantes:

```tsx
<div className="bg-surface dark:bg-gray-900 text-black dark:text-white" />
```

---

## 15. Integracion Checklist

### Fase 1: Setup base

- [ ] `npm install` (sin dependencias adicionales)
- [ ] Importar `@fontsource-variable/geist` en `main.tsx`
- [ ] Crear `src/index.css` con `@theme` y variables CSS (secciones 2.3, 2.4)
- [ ] Configurar `tailwind.config.ts` (si aplica para v4)
- [ ] Ejecutar `npx shadcn@latest init`
- [ ] Agregar componentes shadcn necesarios: `npx shadcn add button card input dialog sheet badge avatar separator tooltip skeleton switch checkbox select tabs accordion toast alert`

### Fase 2: Colores y tipografía

- [ ] Verificar que los colores Tailwind coinciden con la paleta
- [ ] Verificar que Geist se renderiza correctamente
- [ ] Configurar `--radius: 0` como default

### Fase 3: Layout shell

- [ ] Crear sidebar (Drawer/Sheet) con ancho `84px` / `250px`
- [ ] Crear header con altura `90px`, visible solo en mobile
- [ ] Crear main container con padding responsive
- [ ] Crear footer con links e iconos sociales
- [ ] Implementar dev ribbon

### Fase 4: Iconos

- [ ] Reemplazar todos los `<SvgIcon>` con componentes lucide-react
- [ ] Reemplazar todos los `<FontAwesomeIcon>` con lucide
- [ ] Mover SVG sociales a un archivo `social-icons.tsx`
- [ ] Copiar logos ICESI a `public/images/`
- [ ] Verificar que cada icono tenga el reemplazo correcto

### Fase 5: Componentes

- [ ] Mapear cada componente MUI a su shadcn equivalente
- [ ] Implementar `hoverStyles` como utility class
- [ ] Configurar scrollbars globales y del sidebar
- [ ] Implementar sistema de 3 modos (light / dark / system)
- [ ] Agregar animaciones del sidebar (width transition)

### Fase 6: Verificación

- [ ] La paleta de colores es exacta
- [ ] Todos los iconos tienen reemplazo
- [ ] Los border radius son 0 salvo excepciones
- [ ] Los espaciados coinciden
- [ ] Las sombras coinciden
- [ ] El layout responsive funciona
- [ ] Light/dark mode cambia correctamente

---

> Este documento fue generado a partir del análisis estático del repositorio `ic_portal`. Para actualizarlo, modificar los valores en las secciones correspondientes y regenerar.
