// src/app/models/template.ts
export type Aspect = "9:16" | "16:9" | "1:1";
export type TransitionName = "fade" | "slideLeft" | "slideRight" | "zoomIn" | "zoomOut" | "smoothLeft" | "wipeLeft" | "circleOpen";


export interface FontRef { id: string; name: string; weight?: number; url?: string; serverPath?: string; }
export interface ColorToken { name: string; value: string; }


export interface TextBox {
id: string;
binding?: "title" | "price" | "area" | "tagline" | "address";
text?: string; // fallback si no se usa binding
x: number; y: number; // en px dentro del canvas
width?: number; align?: "left"|"center"|"right";
font: { family: string; weight?: number; size: number; color: string; letterSpacing?: number; lineHeight?: number; shadow?: { color: string; blur: number; x: number; y: number };
stroke?: { color: string; width: number }; boxBg?: string; padding?: number; radius?: number };
animateIn?: { type: "fade"|"slideUp"|"slideLeft"|"zoomIn"; duration: number };
}


export interface ShapeOverlay {
id: string; kind: "rect"|"roundRect"|"gradient"|"stripe";
x: number; y: number; width: number; height: number; radius?: number; opacity?: number;
fill?: string; // admite hex o rgba
}


export interface TemplateGraphic {
id: string;
label: string; // nombre legible
kind: "local"|"bodega"|"departamento"|"casa"|"nave";
aspect: Aspect; fps: number; perImageDuration: number;
palette: ColorToken[]; defaultFont: FontRef;
overlays: ShapeOverlay[]; // elementos de diseño fijos
textBoxes: TextBox[]; // cajas de texto editables
transitions: { in: TransitionName; out: TransitionName; duration: number };
allowCustomFonts: boolean;
}