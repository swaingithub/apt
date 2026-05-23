import type { AppElement } from './types';

let _id = 0;
const id = (prefix: string) => `${prefix}-${Date.now()}-${_id++}`;

function el(
  type: AppElement['type'],
  label: string,
  styles: Record<string, any> = {},
  props: Record<string, any> = {},
  children: AppElement[] = [],
  actions: Record<string, any> = {}
): AppElement {
  return { id: id(type), type, label, styles: styles as any, properties: props, actions, children };
}

// ── E-Commerce Block Templates ──

export function createProductCardBlock(): AppElement[] {
  return [
    el('container', 'Product Card', {
      display: 'flex', flexDirection: 'column', borderRadius: '12px',
      backgroundColor: '#fff', border: '1px solid #e2e8f0', overflow: 'hidden',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
    }, {}, [
      el('image', 'Product Image', { width: '100%', height: '180px', objectFit: 'cover' }, {
        src: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80'
      }),
      el('container', 'Product Info', { display: 'flex', flexDirection: 'column', gap: '6px', padding: '12px' }, {}, [
        el('text', 'Product Name', { fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }, { value: 'Classic Watch' }),
        el('container', 'Price Row', { display: 'flex', alignItems: 'center', gap: '6px' }, {}, [
          el('text', 'Price', { fontSize: '1rem', fontWeight: 700, color: '#6366f1' }, { value: '$49.99' }),
          el('text', 'Original Price', { fontSize: '0.75rem', color: '#94a3b8', textDecoration: 'line-through' }, { value: '$79.99' }),
        ]),
        el('button', 'Add to Cart', {
          backgroundColor: '#6366f1', color: '#fff', padding: '10px', borderRadius: '8px',
          fontWeight: 600, fontSize: '0.8rem', border: 'none', textAlign: 'center', cursor: 'pointer'
        }, { value: 'Add to Cart' }, [], { onClick: { type: 'toast', toastText: 'Added to cart!' } }),
      ]),
    ]),
  ];
}

export function createProductGridBlock(): AppElement[] {
  const products = [
    { name: 'Running Shoes', price: '$89.99', img: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=400&q=80' },
    { name: 'Wireless Earbuds', price: '$59.99', img: 'https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?auto=format&fit=crop&w=400&q=80' },
    { name: 'Leather Bag', price: '$129.99', img: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=400&q=80' },
    { name: 'Sunglasses', price: '$34.99', img: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=400&q=80' },
  ];
  const cards = products.map(p =>
    el('card', p.name, {
      display: 'flex', flexDirection: 'column', gap: '6px',
      padding: '0', backgroundColor: '#fff', borderRadius: '10px',
      border: '1px solid #e2e8f0', overflow: 'hidden'
    }, {}, [
      el('image', p.name, { width: '100%', height: '120px', objectFit: 'cover' }, { src: p.img }),
      el('container', 'Info', { display: 'flex', flexDirection: 'column', gap: '4px', padding: '8px' }, {}, [
        el('text', p.name, { fontSize: '0.75rem', fontWeight: 600, color: '#0f172a' }, { value: p.name }),
        el('text', 'Price', { fontSize: '0.8rem', fontWeight: 700, color: '#6366f1' }, { value: p.price }),
      ]),
    ])
  );
  return [
    el('grid', 'Product Grid', { padding: '0', display: 'grid', gap: '10px' }, { gridCols: 2 }, cards),
  ];
}

export function createCategoryGridBlock(): AppElement[] {
  const categories = [
    { name: 'Electronics', icon: 'Smartphone' },
    { name: 'Fashion', icon: 'Shirt' },
    { name: 'Home', icon: 'Home' },
    { name: 'Sports', icon: 'Activity' },
  ];
  const cats = categories.map(c =>
    el('card', c.name, {
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
      padding: '16px 8px', backgroundColor: '#fff', borderRadius: '12px',
      border: '1px solid #e2e8f0', textAlign: 'center' as any
    }, {}, [
      el('icon', c.name, { color: '#6366f1' }, { iconName: c.icon, iconSize: 28 }),
      el('text', c.name, { fontSize: '0.7rem', fontWeight: 600, color: '#0f172a' }, { value: c.name }),
    ])
  );
  return [
    el('container', 'Categories Section', { padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }, {}, [
      el('heading', 'Section Title', { fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }, { value: 'Shop by Category' }),
      el('grid', 'Category Grid', { display: 'grid', gap: '10px' }, { gridCols: 4 }, cats),
    ]),
  ];
}

export function createSearchBarBlock(): AppElement[] {
  return [
    el('container', 'Search Bar', {
      display: 'flex', alignItems: 'center', gap: '8px',
      padding: '12px 16px', backgroundColor: '#fff'
    }, {}, [
      el('icon', 'Search Icon', { color: '#94a3b8' }, { iconName: 'Search', iconSize: 18 }),
      el('input', 'Search Input', {
        border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 14px',
        fontSize: '0.85rem', backgroundColor: '#f8fafc', flex: 1
      }, { placeholder: 'Search products...' }, [], { onChange: { type: 'none' } }),
    ]),
  ];
}

export function createFeaturedProductsBlock(): AppElement[] {
  const featured = [
    { name: 'Smart Watch', price: '$199', img: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=80' },
    { name: 'Backpack', price: '$79', img: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=400&q=80' },
    { name: 'Camera', price: '$549', img: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=400&q=80' },
  ];
  const cards = featured.map(p =>
    el('card', p.name, {
      flex: '0 0 160px', display: 'flex', flexDirection: 'column', gap: '6px',
      padding: '0', backgroundColor: '#fff', borderRadius: '10px',
      border: '1px solid #e2e8f0', overflow: 'hidden'
    }, {}, [
      el('image', p.name, { width: '100%', height: '120px', objectFit: 'cover' }, { src: p.img }),
      el('container', 'Info', { display: 'flex', flexDirection: 'column', gap: '4px', padding: '8px' }, {}, [
        el('text', p.name, { fontSize: '0.75rem', fontWeight: 600, color: '#0f172a' }, { value: p.name }),
        el('text', 'Price', { fontSize: '0.8rem', fontWeight: 700, color: '#6366f1' }, { value: p.price }),
      ]),
    ])
  );
  return [
    el('container', 'Featured Section', { padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }, {}, [
      el('heading', 'Section Title', { fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }, { value: 'Featured' }),
      el('container', 'Horizontal Scroll', {
        display: 'flex', gap: '12px', overflowX: 'auto',
        WebkitOverflowScrolling: 'touch', paddingBottom: '4px'
      }, {}, cards),
    ]),
  ];
}

export function createCartItemBlock(): AppElement[] {
  return [
    el('container', 'Cart Item', {
      display: 'flex', alignItems: 'center', gap: '12px',
      padding: '14px 16px', backgroundColor: '#fff',
      borderBottom: '1px solid #f1f5f9'
    }, {}, [
      el('image', 'Thumbnail', {
        width: '64px', height: '64px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0
      }, { src: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=200&q=80' }),
      el('container', 'Item Info', { flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }, {}, [
        el('text', 'Item Name', { fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }, { value: 'Product Name' }),
        el('text', 'Item Price', { fontSize: '0.85rem', fontWeight: 700, color: '#6366f1' }, { value: '$49.99' }),
        el('container', 'Quantity Row', { display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }, {}, [
          el('button', 'Minus', {
            width: '28px', height: '28px', padding: '0', borderRadius: '6px',
            backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0',
            fontWeight: 600, fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }, { value: '-' }),
          el('text', 'Quantity', { fontSize: '0.8rem', fontWeight: 600, color: '#0f172a', minWidth: '20px', textAlign: 'center' as any }, { value: '1' }),
          el('button', 'Plus', {
            width: '28px', height: '28px', padding: '0', borderRadius: '6px',
            backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0',
            fontWeight: 600, fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }, { value: '+' }),
        ]),
      ]),
      el('icon', 'Delete', { color: '#94a3b8', cursor: 'pointer' }, { iconName: 'Trash2', iconSize: 18 }),
    ]),
  ];
}

export function createOrderSummaryBlock(): AppElement[] {
  return [
    el('card', 'Order Summary', {
      display: 'flex', flexDirection: 'column', gap: '10px',
      padding: '20px', backgroundColor: '#fff', borderRadius: '12px',
      border: '1px solid #e2e8f0'
    }, {}, [
      el('heading', 'Summary Title', { fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }, { value: 'Order Summary' }),
      el('container', 'Subtotal Row', { display: 'flex', justifyContent: 'space-between' }, {}, [
        el('text', 'Subtotal Label', { fontSize: '0.8rem', color: '#64748b' }, { value: 'Subtotal' }),
        el('text', 'Subtotal Value', { fontSize: '0.8rem', fontWeight: 600, color: '#0f172a' }, { value: '$149.97' }),
      ]),
      el('container', 'Shipping Row', { display: 'flex', justifyContent: 'space-between' }, {}, [
        el('text', 'Shipping Label', { fontSize: '0.8rem', color: '#64748b' }, { value: 'Shipping' }),
        el('text', 'Shipping Value', { fontSize: '0.8rem', fontWeight: 600, color: '#22c55e' }, { value: 'Free' }),
      ]),
      el('divider', 'Divider', { margin: '2px 0' }, {}),
      el('container', 'Total Row', { display: 'flex', justifyContent: 'space-between' }, {}, [
        el('text', 'Total Label', { fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }, { value: 'Total' }),
        el('text', 'Total Value', { fontSize: '1rem', fontWeight: 800, color: '#6366f1' }, { value: '$149.97' }),
      ]),
      el('button', 'Checkout Button', {
        backgroundColor: '#6366f1', color: '#fff', padding: '14px', borderRadius: '10px',
        fontWeight: 700, fontSize: '0.9rem', border: 'none', textAlign: 'center', cursor: 'pointer',
        marginTop: '4px'
      }, { value: 'Proceed to Checkout' }, [], { onClick: { type: 'toast', toastText: 'Checkout initiated!' } }),
    ]),
  ];
}

export function createPromoBannerBlock(): AppElement[] {
  return [
    el('container', 'Promo Banner', {
      position: 'relative', borderRadius: '14px', overflow: 'hidden',
      margin: '0 16px', minHeight: '140px',
      display: 'flex', flexDirection: 'column', justifyContent: 'center',
      padding: '20px 24px'
    }, {}, [
      el('image', 'Background', {
        position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover'
      }, { src: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=800&q=80' }),
      el('container', 'Overlay', {
        position: 'absolute', inset: 0,
        background: 'linear-gradient(135deg, rgba(99,102,241,0.85) 0%, rgba(139,92,246,0.7) 100%)'
      }, {}),
      el('container', 'Content', { position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }, {}, [
        el('text', 'Badge', { fontSize: '0.65rem', fontWeight: 600, color: '#fef08a', textTransform: 'uppercase' as any, letterSpacing: '0.05em' }, { value: 'Limited Offer' }),
        el('heading', 'Title', { fontSize: '1.3rem', fontWeight: 800, color: '#fff' }, { value: 'Summer Sale' }),
        el('text', 'Subtitle', { fontSize: '0.8rem', color: 'rgba(255,255,255,0.85)' }, { value: 'Up to 50% off on all items' }),
        el('button', 'Shop Now', {
          backgroundColor: '#fff', color: '#6366f1', padding: '8px 20px', borderRadius: '8px',
          fontWeight: 700, fontSize: '0.8rem', border: 'none', cursor: 'pointer', alignSelf: 'flex-start' as any
        }, { value: 'Shop Now' }, [], { onClick: { type: 'toast', toastText: 'Opening sale...' } }),
      ]),
    ]),
  ];
}

export function createColorSwatchesBlock(): AppElement[] {
  const colors = ['#ef4444', '#6366f1', '#22c55e', '#f59e0b', '#ec4899', '#0f172a'];
  return [
    el('container', 'Color Swatches', { display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px' }, {}, [
      el('text', 'Color Label', { fontSize: '0.75rem', fontWeight: 600, color: '#0f172a' }, { value: 'Color:' }),
      el('container', 'Swatch Row', { display: 'flex', gap: '8px' }, {},
        colors.map((c, i) =>
          el('container', `Swatch ${i}`, {
            width: '32px', height: '32px', borderRadius: '50%', backgroundColor: c,
            border: i === 0 ? '3px solid #6366f1' : '2px solid #e2e8f0',
            cursor: 'pointer'
          }, {})
        )
      ),
    ]),
  ];
}

export function createSizePickerBlock(): AppElement[] {
  const sizes = ['S', 'M', 'L', 'XL', 'XXL'];
  return [
    el('container', 'Size Picker', { display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px' }, {}, [
      el('text', 'Size Label', { fontSize: '0.75rem', fontWeight: 600, color: '#0f172a' }, { value: 'Size:' }),
      el('container', 'Size Row', { display: 'flex', gap: '8px' }, {},
        sizes.map((s, i) =>
          el('container', `Size ${s}`, {
            padding: '6px 14px', borderRadius: '8px', backgroundColor: i === 0 ? '#6366f1' : '#f1f5f9',
            border: i === 0 ? 'none' : '1px solid #e2e8f0',
          }, {}, [
            el('text', `Size ${s}`, { fontSize: '0.78rem', fontWeight: 600, color: i === 0 ? '#fff' : '#475569', textAlign: 'center' as any }, { value: s }),
          ])
        )
      ),
    ]),
  ];
}

export function createQuantityStepperBlock(): AppElement[] {
  return [
    el('container', 'Quantity Stepper', { display: 'flex', alignItems: 'center', gap: '12px', padding: '16px' }, {}, [
      el('text', 'Qty Label', { fontSize: '0.75rem', fontWeight: 600, color: '#0f172a' }, { value: 'Quantity:' }),
      el('container', 'Stepper', { display: 'flex', alignItems: 'center', gap: '0', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }, {}, [
        el('button', 'Minus', {
          width: '36px', height: '36px', padding: '0', borderRadius: '0',
          backgroundColor: '#f8fafc', color: '#475569', border: 'none',
          fontWeight: 600, fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }, { value: '-' }),
        el('text', 'Value', { fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', minWidth: '36px', textAlign: 'center' as any, padding: '0 4px' }, { value: '1' }),
        el('button', 'Plus', {
          width: '36px', height: '36px', padding: '0', borderRadius: '0',
          backgroundColor: '#f8fafc', color: '#475569', border: 'none',
          fontWeight: 600, fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }, { value: '+' }),
      ]),
    ]),
  ];
}

export function createBottomNavBlock(): AppElement[] {
  const tabs = [
    { icon: 'Home', label: 'Home' },
    { icon: 'Search', label: 'Search' },
    { icon: 'ShoppingCart', label: 'Cart' },
    { icon: 'Heart', label: 'Wishlist' },
    { icon: 'User', label: 'Profile' },
  ];
  return [
    el('container', 'Bottom Nav', {
      display: 'flex', justifyContent: 'space-around', alignItems: 'center',
      padding: '8px 0', backgroundColor: '#fff', borderTop: '1px solid #e2e8f0'
    }, {},
      tabs.map((t, i) =>
        el('container', t.label, { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', cursor: 'pointer' }, {}, [
          el('icon', t.label, { color: i === 0 ? '#6366f1' : '#94a3b8' }, { iconName: t.icon, iconSize: 20 }),
          el('text', t.label, { fontSize: '0.55rem', fontWeight: i === 0 ? 600 : 500, color: i === 0 ? '#6366f1' : '#94a3b8' }, { value: t.label }),
        ])
      )
    ),
  ];
}

export function createProductDetailHeaderBlock(): AppElement[] {
  return [
    el('container', 'Product Detail', { display: 'flex', flexDirection: 'column', padding: '0', backgroundColor: '#fff' }, {}, [
      el('image', 'Main Image', { width: '100%', height: '280px', objectFit: 'cover' }, {
        src: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80'
      }),
      el('container', 'Thumbnail Row', { display: 'flex', gap: '8px', padding: '10px 16px' }, {}, [
        ...[1,2,3].map(i => el('image', `Thumb ${i}`, {
          width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover',
          border: i === 1 ? '2px solid #6366f1' : '2px solid transparent', cursor: 'pointer'
        }, { src: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=200&q=80' })),
      ]),
      el('container', 'Product Info', { display: 'flex', flexDirection: 'column', gap: '8px', padding: '0 16px 20px' }, {}, [
        el('heading', 'Product Title', { fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }, { value: 'Premium Product' }),
        el('container', 'Rating Row', { display: 'flex', alignItems: 'center', gap: '6px' }, {}, [
          el('text', 'Rating', { fontSize: '0.8rem', color: '#f59e0b', fontWeight: 600 }, { value: '★★★★½' }),
          el('text', 'Reviews', { fontSize: '0.7rem', color: '#64748b' }, { value: '(128 reviews)' }),
        ]),
        el('text', 'Price', { fontSize: '1.3rem', fontWeight: 800, color: '#6366f1' }, { value: '$49.99' }),
        el('text', 'Description', { fontSize: '0.8rem', color: '#64748b', lineHeight: '1.6' }, { value: 'Premium quality product with excellent features. Perfect for everyday use.' }),
      ]),
    ]),
  ];
}

// ── Category: Product Display ──
export const ECOMMERCE_BLOCKS: { category: string; blocks: { id: string; title: string; desc: string; create: () => AppElement[] }[] }[] = [
  {
    category: 'Product Display',
    blocks: [
      { id: 'product-card', title: 'Product Card', desc: 'Image + name + price + add to cart', create: createProductCardBlock },
      { id: 'product-grid', title: 'Product Grid (2×2)', desc: '4 products in 2-column grid', create: createProductGridBlock },
      { id: 'product-detail', title: 'Product Detail', desc: 'Image gallery + info + price', create: createProductDetailHeaderBlock },
      { id: 'featured-scroll', title: 'Featured Scroll', desc: 'Horizontal product scroll', create: createFeaturedProductsBlock },
    ],
  },
  {
    category: 'Shopping',
    blocks: [
      { id: 'cart-item', title: 'Cart Item', desc: 'Line item with quantity controls', create: createCartItemBlock },
      { id: 'order-summary', title: 'Order Summary', desc: 'Subtotal, shipping, total', create: createOrderSummaryBlock },
      { id: 'qty-stepper', title: 'Quantity Stepper', desc: '- / count / + control', create: createQuantityStepperBlock },
    ],
  },
  {
    category: 'Navigation & Search',
    blocks: [
      { id: 'search-bar', title: 'Search Bar', desc: 'Product search input', create: createSearchBarBlock },
      { id: 'category-grid', title: 'Category Grid', desc: '4 icon categories in a row', create: createCategoryGridBlock },
      { id: 'bottom-nav', title: 'Bottom Tab Nav', desc: '5-tab e-commerce nav bar', create: createBottomNavBlock },
    ],
  },
  {
    category: 'Marketing',
    blocks: [
      { id: 'promo-banner', title: 'Promo Banner', desc: 'Sale banner with CTA button', create: createPromoBannerBlock },
      { id: 'color-swatches', title: 'Color Swatches', desc: 'Product color picker row', create: createColorSwatchesBlock },
      { id: 'size-picker', title: 'Size Picker', desc: 'S/M/L/XL size selector', create: createSizePickerBlock },
    ],
  },
];
