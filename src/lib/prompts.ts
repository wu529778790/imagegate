/**
 * Built-in prompt templates for common image generation scenarios.
 */

export interface PromptTemplate {
  id: string;
  label: string;
  icon: string;
  prompt: string;
  category: "product" | "avatar" | "art" | "design" | "photo";
}

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  // 产品图
  {
    id: "product-minimal",
    label: "产品极简",
    icon: "📦",
    prompt: "A professional product photo of [your product] on a clean white background, soft studio lighting, minimalist style, commercial photography, 4K, high detail",
    category: "product",
  },
  {
    id: "product-lifestyle",
    label: "生活场景",
    icon: "🏠",
    prompt: "A lifestyle product photo showing [your product] in a natural home setting, warm natural lighting, cozy atmosphere, editorial style photography",
    category: "product",
  },
  {
    id: "product-flatlay",
    label: "平铺摆拍",
    icon: "📸",
    prompt: "A flat lay product photography of [your product] arranged with complementary props, overhead shot, soft shadows, Instagram aesthetic, clean composition",
    category: "product",
  },

  // 头像/人物
  {
    id: "avatar-professional",
    label: "职业头像",
    icon: "👔",
    prompt: "A professional headshot portrait, clean background, soft studio lighting, confident expression, high resolution, corporate style",
    category: "avatar",
  },
  {
    id: "avatar-anime",
    label: "动漫头像",
    icon: "🎌",
    prompt: "An anime-style character portrait, vibrant colors, detailed features, clean linework, studio quality, avatar composition",
    category: "avatar",
  },
  {
    id: "avatar-3d",
    label: "3D 头像",
    icon: "🧊",
    prompt: "A 3D rendered character portrait, Pixar style, smooth textures, soft lighting, friendly expression, high quality render",
    category: "avatar",
  },

  // 艺术创作
  {
    id: "art-watercolor",
    label: "水彩画",
    icon: "🎨",
    prompt: "A beautiful watercolor painting of [your subject], soft color blending, artistic brushstrokes, delicate details, fine art quality",
    category: "art",
  },
  {
    id: "art-oil",
    label: "油画",
    icon: "🖼️",
    prompt: "An oil painting of [your subject], rich textures, dramatic lighting, classical composition, museum quality, detailed brushwork",
    category: "art",
  },
  {
    id: "art-pixel",
    label: "像素风",
    icon: "👾",
    prompt: "A pixel art illustration of [your subject], retro game style, 16-bit aesthetic, vibrant colors, clean pixel work",
    category: "art",
  },

  // 设计素材
  {
    id: "design-icon",
    label: "App 图标",
    icon: "📱",
    prompt: "A modern app icon design for [your app name], flat design, clean lines, vibrant gradient, centered composition, square format, professional icon design",
    category: "design",
  },
  {
    id: "design-banner",
    label: "横幅海报",
    icon: "🎞️",
    prompt: "A wide banner design for [your purpose], modern typography, bold colors, clean layout, professional marketing material, 16:9 aspect ratio",
    category: "design",
  },
  {
    id: "design-poster",
    label: "创意海报",
    icon: "📰",
    prompt: "A creative poster design for [your event/topic], eye-catching composition, modern graphic design, bold typography, professional quality",
    category: "design",
  },

  // 摄影
  {
    id: "photo-landscape",
    label: "风景摄影",
    icon: "🏔️",
    prompt: "A stunning landscape photograph of [your location], golden hour lighting, dramatic sky, sharp details, National Geographic style, 4K",
    category: "photo",
  },
  {
    id: "photo-food",
    label: "美食摄影",
    icon: "🍕",
    prompt: "A professional food photography of [your dish], appetizing presentation, soft natural lighting, shallow depth of field, magazine quality",
    category: "photo",
  },
  {
    id: "photo-street",
    label: "街拍",
    icon: "🌃",
    prompt: "A cinematic street photography shot of [your scene], moody lighting, film grain, urban atmosphere, 35mm lens, editorial quality",
    category: "photo",
  },
];

export const TEMPLATE_CATEGORIES = [
  { id: "product", label: "产品", icon: "📦" },
  { id: "avatar", label: "头像", icon: "👤" },
  { id: "art", label: "艺术", icon: "🎨" },
  { id: "design", label: "设计", icon: "✨" },
  { id: "photo", label: "摄影", icon: "📷" },
] as const;
