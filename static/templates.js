// Generated: 2026-05-25T09:44:13.590Z

const TEMPLATES = {
  "ecommerce": {
    "name": "E-Commerce",
    "icon": "🛍️",
    "color": "#6366f1",
    "description": "Online store with product catalog, cart, checkout, and order tracking",
    "pages": [
      {
        "id": "page_home",
        "name": "Home",
        "elements": [
          {
            "id": "b_1",
            "type": "container",
            "label": "Hero Banner",
            "styles": {
              "backgroundColor": "#1e293b",
              "borderRadius": 16,
              "padding": 24
            },
            "properties": {},
            "children": [
              {
                "id": "b_2",
                "type": "heading",
                "label": "Hero Title",
                "styles": {
                  "color": "#ffffff",
                  "fontSize": 26,
                  "fontWeight": 800,
                  "textAlign": "center"
                },
                "properties": {
                  "value": "Summer Sale\nUp to 60% Off"
                }
              },
              {
                "id": "b_3",
                "type": "text",
                "label": "Hero Sub",
                "styles": {
                  "color": "#94a3b8",
                  "fontSize": 14,
                  "textAlign": "center",
                  "margin": "8px 0 16px 0"
                },
                "properties": {
                  "value": "Limited time offer on top brands"
                }
              },
              {
                "id": "b_4",
                "type": "button",
                "label": "Shop Now",
                "styles": {
                  "backgroundColor": "#6366f1",
                  "color": "#ffffff",
                  "borderRadius": 8,
                  "padding": "14px 28px",
                  "alignSelf": "center"
                },
                "properties": {
                  "value": "Shop Now"
                },
                "actions": {
                  "onClick": {
                    "type": "navigate",
                    "targetPage": "page_products"
                  }
                }
              }
            ]
          },
          {
            "id": "b_5",
            "type": "heading",
            "label": "Categories Title",
            "styles": {
              "fontSize": 18,
              "fontWeight": 700,
              "margin": "20px 0 12px 0"
            },
            "properties": {
              "value": "Shop by Category"
            }
          },
          {
            "id": "b_6",
            "type": "grid",
            "label": "Categories Grid",
            "styles": {},
            "properties": {
              "gridCols": 2
            },
            "children": [
              {
                "id": "b_7",
                "type": "card",
                "label": "Electronics",
                "styles": {
                  "backgroundColor": "#f0f9ff",
                  "borderRadius": 12,
                  "padding": 16
                },
                "properties": {},
                "children": [
                  {
                    "id": "b_8",
                    "type": "icon",
                    "label": "Cat Icon",
                    "styles": {
                      "textAlign": "center"
                    },
                    "properties": {
                      "iconName": "Smartphone",
                      "iconSize": 32
                    }
                  },
                  {
                    "id": "b_9",
                    "type": "text",
                    "label": "Cat Name",
                    "styles": {
                      "textAlign": "center",
                      "fontWeight": 600,
                      "fontSize": 13,
                      "margin": "8px 0 0 0"
                    },
                    "properties": {
                      "value": "Electronics"
                    }
                  }
                ]
              },
              {
                "id": "b_10",
                "type": "card",
                "label": "Fashion",
                "styles": {
                  "backgroundColor": "#fef2f2",
                  "borderRadius": 12,
                  "padding": 16
                },
                "properties": {},
                "children": [
                  {
                    "id": "b_11",
                    "type": "icon",
                    "label": "Cat Icon",
                    "styles": {
                      "textAlign": "center"
                    },
                    "properties": {
                      "iconName": "Bag",
                      "iconSize": 32
                    }
                  },
                  {
                    "id": "b_12",
                    "type": "text",
                    "label": "Cat Name",
                    "styles": {
                      "textAlign": "center",
                      "fontWeight": 600,
                      "fontSize": 13,
                      "margin": "8px 0 0 0"
                    },
                    "properties": {
                      "value": "Fashion"
                    }
                  }
                ]
              },
              {
                "id": "b_13",
                "type": "card",
                "label": "Home",
                "styles": {
                  "backgroundColor": "#f0fdf4",
                  "borderRadius": 12,
                  "padding": 16
                },
                "properties": {},
                "children": [
                  {
                    "id": "b_14",
                    "type": "icon",
                    "label": "Cat Icon",
                    "styles": {
                      "textAlign": "center"
                    },
                    "properties": {
                      "iconName": "Home",
                      "iconSize": 32
                    }
                  },
                  {
                    "id": "b_15",
                    "type": "text",
                    "label": "Cat Name",
                    "styles": {
                      "textAlign": "center",
                      "fontWeight": 600,
                      "fontSize": 13,
                      "margin": "8px 0 0 0"
                    },
                    "properties": {
                      "value": "Home & Living"
                    }
                  }
                ]
              },
              {
                "id": "b_16",
                "type": "card",
                "label": "Sports",
                "styles": {
                  "backgroundColor": "#fffbeb",
                  "borderRadius": 12,
                  "padding": 16
                },
                "properties": {},
                "children": [
                  {
                    "id": "b_17",
                    "type": "icon",
                    "label": "Cat Icon",
                    "styles": {
                      "textAlign": "center"
                    },
                    "properties": {
                      "iconName": "Heart",
                      "iconSize": 32
                    }
                  },
                  {
                    "id": "b_18",
                    "type": "text",
                    "label": "Cat Name",
                    "styles": {
                      "textAlign": "center",
                      "fontWeight": 600,
                      "fontSize": 13,
                      "margin": "8px 0 0 0"
                    },
                    "properties": {
                      "value": "Sports"
                    }
                  }
                ]
              }
            ]
          },
          {
            "id": "b_19",
            "type": "heading",
            "label": "Featured Title",
            "styles": {
              "fontSize": 18,
              "fontWeight": 700,
              "margin": "24px 0 12px 0"
            },
            "properties": {
              "value": "Featured Products"
            }
          },
          {
            "id": "b_20",
            "type": "shopify_grid",
            "label": "Featured Grid",
            "styles": {},
            "properties": {
              "layout": "grid"
            }
          }
        ]
      },
      {
        "id": "page_products",
        "name": "Products",
        "elements": [
          {
            "id": "b_21",
            "type": "input",
            "label": "Search Bar",
            "styles": {},
            "properties": {
              "placeholder": "Search products..."
            }
          },
          {
            "id": "b_22",
            "type": "grid",
            "label": "Filter Chips",
            "styles": {},
            "properties": {
              "gridCols": 4
            },
            "children": [
              {
                "id": "b_23",
                "type": "button",
                "label": "All",
                "styles": {
                  "backgroundColor": "#6366f1",
                  "color": "#ffffff",
                  "borderRadius": 20
                },
                "properties": {
                  "value": "All"
                }
              },
              {
                "id": "b_24",
                "type": "button",
                "label": "Men",
                "styles": {
                  "backgroundColor": "#f1f5f9",
                  "color": "#0f172a",
                  "borderRadius": 20
                },
                "properties": {
                  "value": "Men"
                }
              },
              {
                "id": "b_25",
                "type": "button",
                "label": "Women",
                "styles": {
                  "backgroundColor": "#f1f5f9",
                  "color": "#0f172a",
                  "borderRadius": 20
                },
                "properties": {
                  "value": "Women"
                }
              },
              {
                "id": "b_26",
                "type": "button",
                "label": "Kids",
                "styles": {
                  "backgroundColor": "#f1f5f9",
                  "color": "#0f172a",
                  "borderRadius": 20
                },
                "properties": {
                  "value": "Kids"
                }
              }
            ]
          },
          {
            "id": "b_27",
            "type": "shopify_grid",
            "label": "Product Grid",
            "styles": {},
            "properties": {
              "layout": "grid"
            }
          }
        ]
      },
      {
        "id": "page_product_detail",
        "name": "Product Detail",
        "elements": [
          {
            "id": "b_28",
            "type": "image",
            "label": "Product Image",
            "styles": {
              "height": 280,
              "borderRadius": 16
            },
            "properties": {
              "src": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600"
            }
          },
          {
            "id": "b_29",
            "type": "heading",
            "label": "Name",
            "styles": {
              "fontSize": 22,
              "fontWeight": 800,
              "margin": "16px 0 4px 0"
            },
            "properties": {
              "value": "Premium Running Shoes"
            }
          },
          {
            "id": "b_30",
            "type": "text",
            "label": "Price",
            "styles": {
              "fontSize": 20,
              "fontWeight": 700,
              "color": "#6366f1"
            },
            "properties": {
              "value": "$89.99"
            }
          },
          {
            "id": "b_31",
            "type": "text",
            "label": "Desc",
            "styles": {
              "fontSize": 14,
              "color": "#64748b"
            },
            "properties": {
              "value": "Lightweight, breathable mesh upper with responsive cushioning."
            }
          },
          {
            "id": "b_32",
            "type": "divider",
            "label": "Divider",
            "styles": {},
            "properties": {}
          },
          {
            "id": "b_33",
            "type": "heading",
            "label": "Size Title",
            "styles": {
              "fontSize": 14,
              "fontWeight": 600
            },
            "properties": {
              "value": "Select Size"
            }
          },
          {
            "id": "b_34",
            "type": "grid",
            "label": "Size Grid",
            "styles": {},
            "properties": {
              "gridCols": 4
            },
            "children": [
              {
                "id": "b_35",
                "type": "button",
                "label": "S",
                "styles": {
                  "backgroundColor": "#f1f5f9",
                  "color": "#0f172a",
                  "borderRadius": 8
                },
                "properties": {
                  "value": "S"
                }
              },
              {
                "id": "b_36",
                "type": "button",
                "label": "M",
                "styles": {
                  "backgroundColor": "#6366f1",
                  "color": "#ffffff",
                  "borderRadius": 8
                },
                "properties": {
                  "value": "M"
                }
              },
              {
                "id": "b_37",
                "type": "button",
                "label": "L",
                "styles": {
                  "backgroundColor": "#f1f5f9",
                  "color": "#0f172a",
                  "borderRadius": 8
                },
                "properties": {
                  "value": "L"
                }
              },
              {
                "id": "b_38",
                "type": "button",
                "label": "XL",
                "styles": {
                  "backgroundColor": "#f1f5f9",
                  "color": "#0f172a",
                  "borderRadius": 8
                },
                "properties": {
                  "value": "XL"
                }
              }
            ]
          },
          {
            "id": "b_39",
            "type": "button",
            "label": "Add to Cart",
            "styles": {
              "backgroundColor": "#6366f1",
              "color": "#ffffff",
              "borderRadius": 12,
              "margin": "20px 0 0 0"
            },
            "properties": {
              "value": "Add to Cart — $89.99"
            },
            "actions": {
              "onClick": {
                "type": "toast",
                "toastText": "Added to cart!"
              }
            }
          }
        ]
      },
      {
        "id": "page_cart",
        "name": "Cart",
        "elements": [
          {
            "id": "b_40",
            "type": "heading",
            "label": "Cart Title",
            "styles": {
              "fontSize": 20,
              "fontWeight": 800
            },
            "properties": {
              "value": "Shopping Cart (2)"
            }
          },
          {
            "id": "b_41",
            "type": "card",
            "label": "Cart Item 1",
            "styles": {
              "borderRadius": 12
            },
            "properties": {},
            "children": [
              {
                "id": "b_42",
                "type": "grid",
                "label": "Item Row",
                "styles": {},
                "properties": {
                  "gridCols": 4
                },
                "children": [
                  {
                    "id": "b_43",
                    "type": "image",
                    "label": "Thumb",
                    "styles": {
                      "height": 70,
                      "width": 70,
                      "borderRadius": 8
                    },
                    "properties": {
                      "src": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200"
                    }
                  },
                  {
                    "id": "b_44",
                    "type": "container",
                    "label": "Info",
                    "styles": {},
                    "properties": {},
                    "children": [
                      {
                        "id": "b_45",
                        "type": "text",
                        "label": "Name",
                        "styles": {
                          "fontWeight": 600
                        },
                        "properties": {
                          "value": "Running Shoes"
                        }
                      },
                      {
                        "id": "b_46",
                        "type": "text",
                        "label": "Price",
                        "styles": {
                          "color": "#6366f1",
                          "fontWeight": 700
                        },
                        "properties": {
                          "value": "$89.99"
                        }
                      }
                    ]
                  }
                ]
              }
            ]
          },
          {
            "id": "b_47",
            "type": "card",
            "label": "Cart Item 2",
            "styles": {
              "borderRadius": 12
            },
            "properties": {},
            "children": [
              {
                "id": "b_48",
                "type": "grid",
                "label": "Item Row",
                "styles": {},
                "properties": {
                  "gridCols": 4
                },
                "children": [
                  {
                    "id": "b_49",
                    "type": "image",
                    "label": "Thumb",
                    "styles": {
                      "height": 70,
                      "width": 70,
                      "borderRadius": 8
                    },
                    "properties": {
                      "src": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200"
                    }
                  },
                  {
                    "id": "b_50",
                    "type": "container",
                    "label": "Info",
                    "styles": {},
                    "properties": {},
                    "children": [
                      {
                        "id": "b_51",
                        "type": "text",
                        "label": "Name",
                        "styles": {
                          "fontWeight": 600
                        },
                        "properties": {
                          "value": "Wireless Headphones"
                        }
                      },
                      {
                        "id": "b_52",
                        "type": "text",
                        "label": "Price",
                        "styles": {
                          "color": "#6366f1",
                          "fontWeight": 700
                        },
                        "properties": {
                          "value": "$149.99"
                        }
                      }
                    ]
                  }
                ]
              }
            ]
          },
          {
            "id": "b_53",
            "type": "divider",
            "label": "Divider",
            "styles": {},
            "properties": {}
          },
          {
            "id": "b_54",
            "type": "heading",
            "label": "Total",
            "styles": {
              "fontSize": 18,
              "fontWeight": 800
            },
            "properties": {
              "value": "Total: $239.98"
            }
          },
          {
            "id": "b_55",
            "type": "button",
            "label": "Checkout",
            "styles": {
              "backgroundColor": "#22c55e",
              "color": "#ffffff",
              "borderRadius": 12
            },
            "properties": {
              "value": "Proceed to Checkout"
            },
            "actions": {
              "onClick": {
                "type": "navigate",
                "targetPage": "page_checkout"
              }
            }
          }
        ]
      },
      {
        "id": "page_checkout",
        "name": "Checkout",
        "elements": [
          {
            "id": "b_56",
            "type": "heading",
            "label": "Title",
            "styles": {
              "fontSize": 20,
              "fontWeight": 800
            },
            "properties": {
              "value": "Checkout"
            }
          },
          {
            "id": "b_57",
            "type": "heading",
            "label": "Ship Section",
            "styles": {
              "fontSize": 14,
              "fontWeight": 600,
              "color": "#6366f1"
            },
            "properties": {
              "value": "SHIPPING ADDRESS"
            }
          },
          {
            "id": "b_58",
            "type": "input",
            "label": "Name",
            "styles": {},
            "properties": {
              "placeholder": "Full Name"
            }
          },
          {
            "id": "b_59",
            "type": "input",
            "label": "Address",
            "styles": {},
            "properties": {
              "placeholder": "Street Address"
            }
          },
          {
            "id": "b_60",
            "type": "grid",
            "label": "City Zip",
            "styles": {},
            "properties": {
              "gridCols": 2
            },
            "children": [
              {
                "id": "b_61",
                "type": "input",
                "label": "City",
                "styles": {},
                "properties": {
                  "placeholder": "City"
                }
              },
              {
                "id": "b_62",
                "type": "input",
                "label": "Zip",
                "styles": {},
                "properties": {
                  "placeholder": "ZIP Code"
                }
              }
            ]
          },
          {
            "id": "b_63",
            "type": "heading",
            "label": "Pay Section",
            "styles": {
              "fontSize": 14,
              "fontWeight": 600,
              "color": "#6366f1"
            },
            "properties": {
              "value": "PAYMENT"
            }
          },
          {
            "id": "b_64",
            "type": "input",
            "label": "Card",
            "styles": {},
            "properties": {
              "placeholder": "Card Number"
            }
          },
          {
            "id": "b_65",
            "type": "grid",
            "label": "Expiry CVV",
            "styles": {},
            "properties": {
              "gridCols": 2
            },
            "children": [
              {
                "id": "b_66",
                "type": "input",
                "label": "Expiry",
                "styles": {},
                "properties": {
                  "placeholder": "MM/YY"
                }
              },
              {
                "id": "b_67",
                "type": "input",
                "label": "CVV",
                "styles": {},
                "properties": {
                  "placeholder": "CVV"
                }
              }
            ]
          },
          {
            "id": "b_68",
            "type": "button",
            "label": "Place",
            "styles": {
              "backgroundColor": "#22c55e",
              "color": "#ffffff",
              "borderRadius": 12
            },
            "properties": {
              "value": "Place Order — $239.98"
            },
            "actions": {
              "onClick": {
                "type": "navigate",
                "targetPage": "page_order_confirmation"
              }
            }
          }
        ]
      },
      {
        "id": "page_order_confirmation",
        "name": "Order Confirmation",
        "elements": [
          {
            "id": "b_69",
            "type": "container",
            "label": "Success Card",
            "styles": {
              "backgroundColor": "#f0fdf4",
              "borderRadius": 16,
              "padding": 32,
              "alignItems": "center"
            },
            "properties": {},
            "children": [
              {
                "id": "b_70",
                "type": "heading",
                "label": "Success",
                "styles": {
                  "textAlign": "center",
                  "fontSize": 22,
                  "fontWeight": 800,
                  "color": "#16a34a"
                },
                "properties": {
                  "value": "Order Placed!"
                }
              },
              {
                "id": "b_71",
                "type": "text",
                "label": "Order Num",
                "styles": {
                  "textAlign": "center",
                  "color": "#64748b"
                },
                "properties": {
                  "value": "Order #ORD-48291"
                }
              },
              {
                "id": "b_72",
                "type": "text",
                "label": "Msg",
                "styles": {
                  "textAlign": "center",
                  "color": "#64748b"
                },
                "properties": {
                  "value": "Confirmation email sent."
                }
              }
            ]
          },
          {
            "id": "b_73",
            "type": "button",
            "label": "Continue",
            "styles": {
              "backgroundColor": "#6366f1",
              "color": "#ffffff",
              "borderRadius": 12
            },
            "properties": {
              "value": "Continue Shopping"
            },
            "actions": {
              "onClick": {
                "type": "navigate",
                "targetPage": "page_home"
              }
            }
          }
        ]
      },
      {
        "id": "page_wishlist",
        "name": "Wishlist",
        "elements": [
          {
            "id": "b_74",
            "type": "heading",
            "label": "Title",
            "styles": {
              "fontSize": 20,
              "fontWeight": 800
            },
            "properties": {
              "value": "My Wishlist (3)"
            }
          },
          {
            "id": "b_75",
            "type": "card",
            "label": "Item 1",
            "styles": {
              "borderRadius": 12
            },
            "properties": {},
            "children": [
              {
                "id": "b_76",
                "type": "grid",
                "label": "Row",
                "styles": {},
                "properties": {
                  "gridCols": 4
                },
                "children": [
                  {
                    "id": "b_77",
                    "type": "image",
                    "label": "Thumb",
                    "styles": {
                      "height": 70,
                      "width": 70,
                      "borderRadius": 8
                    },
                    "properties": {
                      "src": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200"
                    }
                  },
                  {
                    "id": "b_78",
                    "type": "container",
                    "label": "Info",
                    "styles": {},
                    "properties": {},
                    "children": [
                      {
                        "id": "b_79",
                        "type": "text",
                        "label": "Name",
                        "styles": {
                          "fontWeight": 600
                        },
                        "properties": {
                          "value": "Headphones"
                        }
                      },
                      {
                        "id": "b_80",
                        "type": "text",
                        "label": "Price",
                        "styles": {
                          "color": "#6366f1",
                          "fontWeight": 700
                        },
                        "properties": {
                          "value": "$149.99"
                        }
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  "business": {
    "name": "Business",
    "icon": "💼",
    "color": "#2563eb",
    "description": "Professional landing page with services, team, and contact form",
    "pages": [
      {
        "id": "page_home",
        "name": "Home",
        "elements": [
          {
            "id": "b_1",
            "type": "container",
            "label": "Hero",
            "styles": {
              "backgroundColor": "#0f172a",
              "borderRadius": 20,
              "padding": 32,
              "alignItems": "center"
            },
            "properties": {},
            "children": [
              {
                "id": "b_2",
                "type": "heading",
                "label": "Hero Title",
                "styles": {
                  "color": "#ffffff",
                  "fontSize": 28,
                  "fontWeight": 800,
                  "textAlign": "center"
                },
                "properties": {
                  "value": "We Build\nDigital Products"
                }
              },
              {
                "id": "b_3",
                "type": "text",
                "label": "Sub",
                "styles": {
                  "color": "#94a3b8",
                  "textAlign": "center"
                },
                "properties": {
                  "value": "Award-winning agency helping startups scale."
                }
              },
              {
                "id": "b_4",
                "type": "button",
                "label": "CTA",
                "styles": {
                  "backgroundColor": "#2563eb",
                  "color": "#ffffff",
                  "borderRadius": 10,
                  "alignSelf": "center"
                },
                "properties": {
                  "value": "Get Started"
                },
                "actions": {
                  "onClick": {
                    "type": "navigate",
                    "targetPage": "page_contact"
                  }
                }
              }
            ]
          },
          {
            "id": "b_5",
            "type": "heading",
            "label": "Services Title",
            "styles": {
              "fontSize": 20,
              "fontWeight": 700
            },
            "properties": {
              "value": "Our Services"
            }
          },
          {
            "id": "b_6",
            "type": "grid",
            "label": "Services Grid",
            "styles": {},
            "properties": {
              "gridCols": 2
            },
            "children": [
              {
                "id": "b_7",
                "type": "card",
                "label": "Design",
                "styles": {
                  "borderRadius": 12
                },
                "properties": {},
                "children": [
                  {
                    "id": "b_8",
                    "type": "text",
                    "label": "Name",
                    "styles": {
                      "fontWeight": 700,
                      "textAlign": "center"
                    },
                    "properties": {
                      "value": "🎨 Design"
                    }
                  }
                ]
              },
              {
                "id": "b_9",
                "type": "card",
                "label": "Dev",
                "styles": {
                  "borderRadius": 12
                },
                "properties": {},
                "children": [
                  {
                    "id": "b_10",
                    "type": "text",
                    "label": "Name",
                    "styles": {
                      "fontWeight": 700,
                      "textAlign": "center"
                    },
                    "properties": {
                      "value": "💻 Development"
                    }
                  }
                ]
              },
              {
                "id": "b_11",
                "type": "card",
                "label": "Branding",
                "styles": {
                  "borderRadius": 12
                },
                "properties": {},
                "children": [
                  {
                    "id": "b_12",
                    "type": "text",
                    "label": "Name",
                    "styles": {
                      "fontWeight": 700,
                      "textAlign": "center"
                    },
                    "properties": {
                      "value": "✨ Branding"
                    }
                  }
                ]
              },
              {
                "id": "b_13",
                "type": "card",
                "label": "Marketing",
                "styles": {
                  "borderRadius": 12
                },
                "properties": {},
                "children": [
                  {
                    "id": "b_14",
                    "type": "text",
                    "label": "Name",
                    "styles": {
                      "fontWeight": 700,
                      "textAlign": "center"
                    },
                    "properties": {
                      "value": "📈 Marketing"
                    }
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        "id": "page_about",
        "name": "About",
        "elements": [
          {
            "id": "b_15",
            "type": "heading",
            "label": "Title",
            "styles": {
              "fontSize": 24,
              "fontWeight": 800
            },
            "properties": {
              "value": "About Us"
            }
          },
          {
            "id": "b_16",
            "type": "image",
            "label": "Team",
            "styles": {
              "height": 200,
              "borderRadius": 16
            },
            "properties": {
              "src": "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600"
            }
          },
          {
            "id": "b_17",
            "type": "text",
            "label": "Story",
            "styles": {
              "fontSize": 14,
              "color": "#64748b"
            },
            "properties": {
              "value": "We are a team of passionate designers and engineers. Founded in 2020, we've helped over 100 startups launch their products."
            }
          },
          {
            "id": "b_18",
            "type": "heading",
            "label": "Stats",
            "styles": {
              "fontSize": 16,
              "fontWeight": 700
            },
            "properties": {
              "value": "By the Numbers"
            }
          },
          {
            "id": "b_19",
            "type": "grid",
            "label": "Stats Grid",
            "styles": {},
            "properties": {
              "gridCols": 3
            },
            "children": [
              {
                "id": "b_20",
                "type": "card",
                "label": "Stat 1",
                "styles": {
                  "borderRadius": 12,
                  "alignItems": "center"
                },
                "properties": {},
                "children": [
                  {
                    "id": "b_21",
                    "type": "heading",
                    "label": "Num",
                    "styles": {
                      "fontSize": 24,
                      "fontWeight": 800,
                      "color": "#2563eb",
                      "textAlign": "center"
                    },
                    "properties": {
                      "value": "100+"
                    }
                  },
                  {
                    "id": "b_22",
                    "type": "text",
                    "label": "Label",
                    "styles": {
                      "color": "#64748b",
                      "textAlign": "center"
                    },
                    "properties": {
                      "value": "Projects"
                    }
                  }
                ]
              },
              {
                "id": "b_23",
                "type": "card",
                "label": "Stat 2",
                "styles": {
                  "borderRadius": 12,
                  "alignItems": "center"
                },
                "properties": {},
                "children": [
                  {
                    "id": "b_24",
                    "type": "heading",
                    "label": "Num",
                    "styles": {
                      "fontSize": 24,
                      "fontWeight": 800,
                      "color": "#2563eb",
                      "textAlign": "center"
                    },
                    "properties": {
                      "value": "50+"
                    }
                  },
                  {
                    "id": "b_25",
                    "type": "text",
                    "label": "Label",
                    "styles": {
                      "color": "#64748b",
                      "textAlign": "center"
                    },
                    "properties": {
                      "value": "Clients"
                    }
                  }
                ]
              },
              {
                "id": "b_26",
                "type": "card",
                "label": "Stat 3",
                "styles": {
                  "borderRadius": 12,
                  "alignItems": "center"
                },
                "properties": {},
                "children": [
                  {
                    "id": "b_27",
                    "type": "heading",
                    "label": "Num",
                    "styles": {
                      "fontSize": 24,
                      "fontWeight": 800,
                      "color": "#2563eb",
                      "textAlign": "center"
                    },
                    "properties": {
                      "value": "4.9"
                    }
                  },
                  {
                    "id": "b_28",
                    "type": "text",
                    "label": "Label",
                    "styles": {
                      "color": "#64748b",
                      "textAlign": "center"
                    },
                    "properties": {
                      "value": "Rating"
                    }
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        "id": "page_services",
        "name": "Services",
        "elements": [
          {
            "id": "b_29",
            "type": "heading",
            "label": "Title",
            "styles": {
              "fontSize": 24,
              "fontWeight": 800
            },
            "properties": {
              "value": "Our Services"
            }
          },
          {
            "id": "b_30",
            "type": "text",
            "label": "Sub",
            "styles": {
              "color": "#64748b"
            },
            "properties": {
              "value": "End-to-end digital product development."
            }
          },
          {
            "id": "b_31",
            "type": "card",
            "label": "Svc 1",
            "styles": {
              "borderRadius": 12
            },
            "properties": {},
            "children": [
              {
                "id": "b_32",
                "type": "heading",
                "label": "Name",
                "styles": {
                  "fontSize": 16,
                  "fontWeight": 700
                },
                "properties": {
                  "value": "Product Design"
                }
              },
              {
                "id": "b_33",
                "type": "text",
                "label": "Desc",
                "styles": {
                  "color": "#64748b"
                },
                "properties": {
                  "value": "UX research, wireframing, prototyping, and visual design."
                }
              }
            ]
          },
          {
            "id": "b_34",
            "type": "card",
            "label": "Svc 2",
            "styles": {
              "borderRadius": 12
            },
            "properties": {},
            "children": [
              {
                "id": "b_35",
                "type": "heading",
                "label": "Name",
                "styles": {
                  "fontSize": 16,
                  "fontWeight": 700
                },
                "properties": {
                  "value": "Mobile Development"
                }
              },
              {
                "id": "b_36",
                "type": "text",
                "label": "Desc",
                "styles": {
                  "color": "#64748b"
                },
                "properties": {
                  "value": "Cross-platform apps built with React Native and Expo."
                }
              }
            ]
          },
          {
            "id": "b_37",
            "type": "card",
            "label": "Svc 3",
            "styles": {
              "borderRadius": 12
            },
            "properties": {},
            "children": [
              {
                "id": "b_38",
                "type": "heading",
                "label": "Name",
                "styles": {
                  "fontSize": 16,
                  "fontWeight": 700
                },
                "properties": {
                  "value": "Cloud Infrastructure"
                }
              },
              {
                "id": "b_39",
                "type": "text",
                "label": "Desc",
                "styles": {
                  "color": "#64748b"
                },
                "properties": {
                  "value": "Scalable backend architecture and DevOps consulting."
                }
              }
            ]
          }
        ]
      },
      {
        "id": "page_team",
        "name": "Team",
        "elements": [
          {
            "id": "b_40",
            "type": "heading",
            "label": "Title",
            "styles": {
              "fontSize": 22,
              "fontWeight": 800
            },
            "properties": {
              "value": "Meet the Team"
            }
          },
          {
            "id": "b_41",
            "type": "grid",
            "label": "Team Grid",
            "styles": {},
            "properties": {
              "gridCols": 2
            },
            "children": [
              {
                "id": "b_42",
                "type": "card",
                "label": "M1",
                "styles": {
                  "borderRadius": 12,
                  "alignItems": "center"
                },
                "properties": {},
                "children": [
                  {
                    "id": "b_43",
                    "type": "image",
                    "label": "Avatar",
                    "styles": {
                      "height": 80,
                      "width": 80,
                      "borderRadius": 40
                    },
                    "properties": {
                      "src": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200"
                    }
                  },
                  {
                    "id": "b_44",
                    "type": "text",
                    "label": "Name",
                    "styles": {
                      "fontWeight": 700,
                      "textAlign": "center"
                    },
                    "properties": {
                      "value": "Alex Johnson"
                    }
                  },
                  {
                    "id": "b_45",
                    "type": "text",
                    "label": "Role",
                    "styles": {
                      "color": "#64748b",
                      "textAlign": "center"
                    },
                    "properties": {
                      "value": "CEO"
                    }
                  }
                ]
              },
              {
                "id": "b_46",
                "type": "card",
                "label": "M2",
                "styles": {
                  "borderRadius": 12,
                  "alignItems": "center"
                },
                "properties": {},
                "children": [
                  {
                    "id": "b_47",
                    "type": "image",
                    "label": "Avatar",
                    "styles": {
                      "height": 80,
                      "width": 80,
                      "borderRadius": 40
                    },
                    "properties": {
                      "src": "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200"
                    }
                  },
                  {
                    "id": "b_48",
                    "type": "text",
                    "label": "Name",
                    "styles": {
                      "fontWeight": 700,
                      "textAlign": "center"
                    },
                    "properties": {
                      "value": "Sarah Chen"
                    }
                  },
                  {
                    "id": "b_49",
                    "type": "text",
                    "label": "Role",
                    "styles": {
                      "color": "#64748b",
                      "textAlign": "center"
                    },
                    "properties": {
                      "value": "Designer"
                    }
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        "id": "page_testimonials",
        "name": "Testimonials",
        "elements": [
          {
            "id": "b_50",
            "type": "heading",
            "label": "Title",
            "styles": {
              "fontSize": 22,
              "fontWeight": 800
            },
            "properties": {
              "value": "What Clients Say"
            }
          },
          {
            "id": "b_51",
            "type": "card",
            "label": "T1",
            "styles": {
              "borderRadius": 12,
              "backgroundColor": "#f8fafc"
            },
            "properties": {},
            "children": [
              {
                "id": "b_52",
                "type": "text",
                "label": "Quote",
                "styles": {
                  "fontStyle": "italic"
                },
                "properties": {
                  "value": "\"Working with this team transformed our product!\""
                }
              },
              {
                "id": "b_53",
                "type": "text",
                "label": "Author",
                "styles": {
                  "fontWeight": 700,
                  "margin": "8px 0 0 0"
                },
                "properties": {
                  "value": "— Alex Johnson, TechCorp"
                }
              }
            ]
          },
          {
            "id": "b_54",
            "type": "card",
            "label": "T2",
            "styles": {
              "borderRadius": 12,
              "backgroundColor": "#f8fafc"
            },
            "properties": {},
            "children": [
              {
                "id": "b_55",
                "type": "text",
                "label": "Quote",
                "styles": {
                  "fontStyle": "italic"
                },
                "properties": {
                  "value": "\"Professional, creative, and incredibly easy to work with!\""
                }
              },
              {
                "id": "b_56",
                "type": "text",
                "label": "Author",
                "styles": {
                  "fontWeight": 700,
                  "margin": "8px 0 0 0"
                },
                "properties": {
                  "value": "— Sarah Chen, DesignStudio"
                }
              }
            ]
          }
        ]
      },
      {
        "id": "page_contact",
        "name": "Contact",
        "elements": [
          {
            "id": "b_57",
            "type": "heading",
            "label": "Title",
            "styles": {
              "fontSize": 22,
              "fontWeight": 800
            },
            "properties": {
              "value": "Get in Touch"
            }
          },
          {
            "id": "b_58",
            "type": "text",
            "label": "Sub",
            "styles": {
              "color": "#64748b"
            },
            "properties": {
              "value": "We'd love to hear from you."
            }
          },
          {
            "id": "b_59",
            "type": "card",
            "label": "Form",
            "styles": {
              "borderRadius": 16
            },
            "properties": {},
            "children": [
              {
                "id": "b_60",
                "type": "input",
                "label": "Name",
                "styles": {},
                "properties": {
                  "placeholder": "Your Name"
                }
              },
              {
                "id": "b_61",
                "type": "input",
                "label": "Email",
                "styles": {},
                "properties": {
                  "placeholder": "your@email.com"
                }
              },
              {
                "id": "b_62",
                "type": "textarea",
                "label": "Message",
                "styles": {},
                "properties": {
                  "placeholder": "Your message..."
                }
              },
              {
                "id": "b_63",
                "type": "button",
                "label": "Send",
                "styles": {
                  "backgroundColor": "#2563eb",
                  "color": "#ffffff",
                  "borderRadius": 10
                },
                "properties": {
                  "value": "Send Message"
                },
                "actions": {
                  "onClick": {
                    "type": "toast",
                    "toastText": "Message sent!"
                  }
                }
              }
            ]
          }
        ]
      },
      {
        "id": "page_faq",
        "name": "FAQ",
        "elements": [
          {
            "id": "b_64",
            "type": "heading",
            "label": "Title",
            "styles": {
              "fontSize": 22,
              "fontWeight": 800
            },
            "properties": {
              "value": "FAQ"
            }
          },
          {
            "id": "b_65",
            "type": "card",
            "label": "Q1",
            "styles": {
              "borderRadius": 12
            },
            "properties": {},
            "children": [
              {
                "id": "b_66",
                "type": "text",
                "label": "Q",
                "styles": {
                  "fontWeight": 700
                },
                "properties": {
                  "value": "What is the typical timeline?"
                }
              },
              {
                "id": "b_67",
                "type": "text",
                "label": "A",
                "styles": {
                  "color": "#64748b"
                },
                "properties": {
                  "value": "Most projects take 4-8 weeks from kickoff to launch."
                }
              }
            ]
          },
          {
            "id": "b_68",
            "type": "card",
            "label": "Q2",
            "styles": {
              "borderRadius": 12
            },
            "properties": {},
            "children": [
              {
                "id": "b_69",
                "type": "text",
                "label": "Q",
                "styles": {
                  "fontWeight": 700
                },
                "properties": {
                  "value": "Do you offer ongoing support?"
                }
              },
              {
                "id": "b_70",
                "type": "text",
                "label": "A",
                "styles": {
                  "color": "#64748b"
                },
                "properties": {
                  "value": "Yes! We offer maintenance and support packages post-launch."
                }
              }
            ]
          }
        ]
      }
    ]
  },
  "restaurant": {
    "name": "Restaurant",
    "icon": "🍽️",
    "color": "#ef4444",
    "description": "Restaurant app with menu, reservations, and location",
    "pages": [
      {
        "id": "page_home",
        "name": "Home",
        "elements": [
          {
            "id": "b_1",
            "type": "image",
            "label": "Hero",
            "styles": {
              "height": 240,
              "borderRadius": 16
            },
            "properties": {
              "src": "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600"
            }
          },
          {
            "id": "b_2",
            "type": "heading",
            "label": "Name",
            "styles": {
              "fontSize": 26,
              "fontWeight": 800,
              "textAlign": "center"
            },
            "properties": {
              "value": "La Maison"
            }
          },
          {
            "id": "b_3",
            "type": "text",
            "label": "Cuisine",
            "styles": {
              "textAlign": "center",
              "color": "#64748b"
            },
            "properties": {
              "value": "French · Italian · Mediterranean"
            }
          },
          {
            "id": "b_4",
            "type": "text",
            "label": "Rating",
            "styles": {
              "textAlign": "center",
              "color": "#f59e0b"
            },
            "properties": {
              "value": "★★★★★  4.8 (200+ reviews)"
            }
          },
          {
            "id": "b_5",
            "type": "grid",
            "label": "Actions",
            "styles": {},
            "properties": {
              "gridCols": 2
            },
            "children": [
              {
                "id": "b_6",
                "type": "button",
                "label": "Menu",
                "styles": {
                  "backgroundColor": "#ef4444",
                  "color": "#ffffff",
                  "borderRadius": 10
                },
                "properties": {
                  "value": "📋 View Menu"
                },
                "actions": {
                  "onClick": {
                    "type": "navigate",
                    "targetPage": "page_menu"
                  }
                }
              },
              {
                "id": "b_7",
                "type": "button",
                "label": "Reserve",
                "styles": {
                  "backgroundColor": "#0f172a",
                  "color": "#ffffff",
                  "borderRadius": 10
                },
                "properties": {
                  "value": "📅 Reserve"
                },
                "actions": {
                  "onClick": {
                    "type": "navigate",
                    "targetPage": "page_reservations"
                  }
                }
              }
            ]
          }
        ]
      },
      {
        "id": "page_menu",
        "name": "Menu",
        "elements": [
          {
            "id": "b_8",
            "type": "heading",
            "label": "Title",
            "styles": {
              "fontSize": 22,
              "fontWeight": 800
            },
            "properties": {
              "value": "Our Menu"
            }
          },
          {
            "id": "b_9",
            "type": "heading",
            "label": "Cat 1",
            "styles": {
              "fontSize": 16,
              "fontWeight": 700,
              "color": "#ef4444"
            },
            "properties": {
              "value": "Appetizers"
            }
          },
          {
            "id": "b_10",
            "type": "card",
            "label": "Item 1",
            "styles": {
              "borderRadius": 12
            },
            "properties": {},
            "children": [
              {
                "id": "b_11",
                "type": "text",
                "label": "Name",
                "styles": {
                  "fontWeight": 700
                },
                "properties": {
                  "value": "Bruschetta — $12"
                }
              },
              {
                "id": "b_12",
                "type": "text",
                "label": "Desc",
                "styles": {
                  "color": "#64748b"
                },
                "properties": {
                  "value": "Toasted bread with tomato, basil, and mozzarella"
                }
              }
            ]
          },
          {
            "id": "b_13",
            "type": "card",
            "label": "Item 2",
            "styles": {
              "borderRadius": 12
            },
            "properties": {},
            "children": [
              {
                "id": "b_14",
                "type": "text",
                "label": "Name",
                "styles": {
                  "fontWeight": 700
                },
                "properties": {
                  "value": "Calamari — $14"
                }
              },
              {
                "id": "b_15",
                "type": "text",
                "label": "Desc",
                "styles": {
                  "color": "#64748b"
                },
                "properties": {
                  "value": "Crispy fried squid with marinara sauce"
                }
              }
            ]
          },
          {
            "id": "b_16",
            "type": "heading",
            "label": "Cat 2",
            "styles": {
              "fontSize": 16,
              "fontWeight": 700,
              "color": "#ef4444"
            },
            "properties": {
              "value": "Main Courses"
            }
          },
          {
            "id": "b_17",
            "type": "card",
            "label": "Item 3",
            "styles": {
              "borderRadius": 12
            },
            "properties": {},
            "children": [
              {
                "id": "b_18",
                "type": "text",
                "label": "Name",
                "styles": {
                  "fontWeight": 700
                },
                "properties": {
                  "value": "Grilled Salmon — $26"
                }
              },
              {
                "id": "b_19",
                "type": "text",
                "label": "Desc",
                "styles": {
                  "color": "#64748b"
                },
                "properties": {
                  "value": "Atlantic salmon with lemon butter sauce"
                }
              }
            ]
          },
          {
            "id": "b_20",
            "type": "card",
            "label": "Item 4",
            "styles": {
              "borderRadius": 12
            },
            "properties": {},
            "children": [
              {
                "id": "b_21",
                "type": "text",
                "label": "Name",
                "styles": {
                  "fontWeight": 700
                },
                "properties": {
                  "value": "Steak Frites — $32"
                }
              },
              {
                "id": "b_22",
                "type": "text",
                "label": "Desc",
                "styles": {
                  "color": "#64748b"
                },
                "properties": {
                  "value": "8oz ribeye with hand-cut fries"
                }
              }
            ]
          }
        ]
      },
      {
        "id": "page_reservations",
        "name": "Reservations",
        "elements": [
          {
            "id": "b_23",
            "type": "heading",
            "label": "Title",
            "styles": {
              "fontSize": 22,
              "fontWeight": 800
            },
            "properties": {
              "value": "Make a Reservation"
            }
          },
          {
            "id": "b_24",
            "type": "input",
            "label": "Name",
            "styles": {},
            "properties": {
              "placeholder": "Full Name"
            }
          },
          {
            "id": "b_25",
            "type": "input",
            "label": "Email",
            "styles": {},
            "properties": {
              "placeholder": "Email"
            }
          },
          {
            "id": "b_26",
            "type": "grid",
            "label": "Date Time",
            "styles": {},
            "properties": {
              "gridCols": 2
            },
            "children": [
              {
                "id": "b_27",
                "type": "input",
                "label": "Date",
                "styles": {},
                "properties": {
                  "placeholder": "Date"
                }
              },
              {
                "id": "b_28",
                "type": "input",
                "label": "Time",
                "styles": {},
                "properties": {
                  "placeholder": "Time"
                }
              }
            ]
          },
          {
            "id": "b_29",
            "type": "input",
            "label": "Guests",
            "styles": {},
            "properties": {
              "placeholder": "Number of Guests"
            }
          },
          {
            "id": "b_30",
            "type": "button",
            "label": "Reserve",
            "styles": {
              "backgroundColor": "#ef4444",
              "color": "#ffffff",
              "borderRadius": 10
            },
            "properties": {
              "value": "Confirm Reservation"
            },
            "actions": {
              "onClick": {
                "type": "toast",
                "toastText": "Reservation confirmed!"
              }
            }
          }
        ]
      },
      {
        "id": "page_reviews",
        "name": "Reviews",
        "elements": [
          {
            "id": "b_31",
            "type": "heading",
            "label": "Title",
            "styles": {
              "fontSize": 22,
              "fontWeight": 800
            },
            "properties": {
              "value": "Guest Reviews"
            }
          },
          {
            "id": "b_32",
            "type": "card",
            "label": "R1",
            "styles": {
              "borderRadius": 12
            },
            "properties": {},
            "children": [
              {
                "id": "b_33",
                "type": "text",
                "label": "Rating",
                "styles": {
                  "color": "#f59e0b"
                },
                "properties": {
                  "value": "★★★★★"
                }
              },
              {
                "id": "b_34",
                "type": "text",
                "label": "Text",
                "styles": {
                  "color": "#334155"
                },
                "properties": {
                  "value": "Amazing food and atmosphere!"
                }
              },
              {
                "id": "b_35",
                "type": "text",
                "label": "Author",
                "styles": {
                  "color": "#64748b"
                },
                "properties": {
                  "value": "— Michael T."
                }
              }
            ]
          }
        ]
      },
      {
        "id": "page_location",
        "name": "Location",
        "elements": [
          {
            "id": "b_36",
            "type": "heading",
            "label": "Title",
            "styles": {
              "fontSize": 22,
              "fontWeight": 800
            },
            "properties": {
              "value": "Find Us"
            }
          },
          {
            "id": "b_37",
            "type": "card",
            "label": "Address",
            "styles": {
              "borderRadius": 12,
              "backgroundColor": "#f8fafc"
            },
            "properties": {},
            "children": [
              {
                "id": "b_38",
                "type": "text",
                "label": "Addr",
                "styles": {
                  "fontWeight": 700
                },
                "properties": {
                  "value": "📍 123 Gourmet Street, NY"
                }
              }
            ]
          },
          {
            "id": "b_39",
            "type": "card",
            "label": "Hours",
            "styles": {
              "borderRadius": 12,
              "backgroundColor": "#f8fafc"
            },
            "properties": {},
            "children": [
              {
                "id": "b_40",
                "type": "text",
                "label": "Hours",
                "styles": {
                  "fontWeight": 700
                },
                "properties": {
                  "value": "🕐 Mon–Fri: 11AM–10PM\nSat–Sun: 9AM–11PM"
                }
              }
            ]
          },
          {
            "id": "b_41",
            "type": "card",
            "label": "Contact",
            "styles": {
              "borderRadius": 12,
              "backgroundColor": "#f8fafc"
            },
            "properties": {},
            "children": [
              {
                "id": "b_42",
                "type": "text",
                "label": "Phone",
                "styles": {
                  "fontWeight": 700
                },
                "properties": {
                  "value": "📞 (212) 555-0198"
                }
              }
            ]
          }
        ]
      }
    ]
  },
  "fitness": {
    "name": "Health & Fitness",
    "icon": "💪",
    "color": "#22c55e",
    "description": "Fitness app with workouts, progress tracking, and scheduling",
    "pages": [
      {
        "id": "page_home",
        "name": "Home",
        "elements": [
          {
            "id": "b_1",
            "type": "container",
            "label": "Welcome",
            "styles": {
              "backgroundColor": "#22c55e",
              "borderRadius": 16,
              "padding": 24
            },
            "properties": {},
            "children": [
              {
                "id": "b_2",
                "type": "heading",
                "label": "Greeting",
                "styles": {
                  "color": "#ffffff",
                  "fontSize": 22,
                  "fontWeight": 800
                },
                "properties": {
                  "value": "Good Morning\nAlex!"
                }
              },
              {
                "id": "b_3",
                "type": "text",
                "label": "Motivation",
                "styles": {
                  "color": "#dcfce7"
                },
                "properties": {
                  "value": "Let's crush today's workout."
                }
              }
            ]
          },
          {
            "id": "b_4",
            "type": "grid",
            "label": "Stats",
            "styles": {},
            "properties": {
              "gridCols": 3
            },
            "children": [
              {
                "id": "b_5",
                "type": "card",
                "label": "Steps",
                "styles": {
                  "borderRadius": 12,
                  "alignItems": "center"
                },
                "properties": {},
                "children": [
                  {
                    "id": "b_6",
                    "type": "heading",
                    "label": "Num",
                    "styles": {
                      "fontSize": 20,
                      "fontWeight": 800,
                      "color": "#22c55e",
                      "textAlign": "center"
                    },
                    "properties": {
                      "value": "6,842"
                    }
                  },
                  {
                    "id": "b_7",
                    "type": "text",
                    "label": "Label",
                    "styles": {
                      "color": "#64748b",
                      "textAlign": "center"
                    },
                    "properties": {
                      "value": "Steps"
                    }
                  }
                ]
              },
              {
                "id": "b_8",
                "type": "card",
                "label": "Calories",
                "styles": {
                  "borderRadius": 12,
                  "alignItems": "center"
                },
                "properties": {},
                "children": [
                  {
                    "id": "b_9",
                    "type": "heading",
                    "label": "Num",
                    "styles": {
                      "fontSize": 20,
                      "fontWeight": 800,
                      "color": "#22c55e",
                      "textAlign": "center"
                    },
                    "properties": {
                      "value": "420"
                    }
                  },
                  {
                    "id": "b_10",
                    "type": "text",
                    "label": "Label",
                    "styles": {
                      "color": "#64748b",
                      "textAlign": "center"
                    },
                    "properties": {
                      "value": "Cal"
                    }
                  }
                ]
              },
              {
                "id": "b_11",
                "type": "card",
                "label": "Minutes",
                "styles": {
                  "borderRadius": 12,
                  "alignItems": "center"
                },
                "properties": {},
                "children": [
                  {
                    "id": "b_12",
                    "type": "heading",
                    "label": "Num",
                    "styles": {
                      "fontSize": 20,
                      "fontWeight": 800,
                      "color": "#22c55e",
                      "textAlign": "center"
                    },
                    "properties": {
                      "value": "45"
                    }
                  },
                  {
                    "id": "b_13",
                    "type": "text",
                    "label": "Label",
                    "styles": {
                      "color": "#64748b",
                      "textAlign": "center"
                    },
                    "properties": {
                      "value": "Min"
                    }
                  }
                ]
              }
            ]
          },
          {
            "id": "b_14",
            "type": "heading",
            "label": "Today Title",
            "styles": {
              "fontSize": 18,
              "fontWeight": 700
            },
            "properties": {
              "value": "Today's Workout"
            }
          },
          {
            "id": "b_15",
            "type": "card",
            "label": "Workout",
            "styles": {
              "borderRadius": 12,
              "backgroundColor": "#f0fdf4"
            },
            "properties": {},
            "children": [
              {
                "id": "b_16",
                "type": "text",
                "label": "Name",
                "styles": {
                  "fontWeight": 700
                },
                "properties": {
                  "value": "Upper Body Strength"
                }
              },
              {
                "id": "b_17",
                "type": "text",
                "label": "Meta",
                "styles": {
                  "color": "#64748b"
                },
                "properties": {
                  "value": "8 exercises · 45 min"
                }
              },
              {
                "id": "b_18",
                "type": "button",
                "label": "Start",
                "styles": {
                  "backgroundColor": "#22c55e",
                  "color": "#ffffff",
                  "borderRadius": 8
                },
                "properties": {
                  "value": "Start Workout"
                },
                "actions": {
                  "onClick": {
                    "type": "navigate",
                    "targetPage": "page_workout_detail"
                  }
                }
              }
            ]
          }
        ]
      },
      {
        "id": "page_workout_detail",
        "name": "Workout Detail",
        "elements": [
          {
            "id": "b_19",
            "type": "heading",
            "label": "Title",
            "styles": {
              "fontSize": 22,
              "fontWeight": 800
            },
            "properties": {
              "value": "Upper Body Strength"
            }
          },
          {
            "id": "b_20",
            "type": "text",
            "label": "Meta",
            "styles": {
              "color": "#64748b"
            },
            "properties": {
              "value": "8 exercises · 45 min · Intermediate"
            }
          },
          {
            "id": "b_21",
            "type": "card",
            "label": "Ex 1",
            "styles": {
              "borderRadius": 12
            },
            "properties": {},
            "children": [
              {
                "id": "b_22",
                "type": "grid",
                "label": "Row",
                "styles": {},
                "properties": {
                  "gridCols": 4
                },
                "children": [
                  {
                    "id": "b_23",
                    "type": "image",
                    "label": "Thumb",
                    "styles": {
                      "height": 60,
                      "width": 60,
                      "borderRadius": 10
                    },
                    "properties": {
                      "src": "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=200"
                    }
                  },
                  {
                    "id": "b_24",
                    "type": "container",
                    "label": "Info",
                    "styles": {},
                    "properties": {},
                    "children": [
                      {
                        "id": "b_25",
                        "type": "text",
                        "label": "Name",
                        "styles": {
                          "fontWeight": 700
                        },
                        "properties": {
                          "value": "Bench Press"
                        }
                      },
                      {
                        "id": "b_26",
                        "type": "text",
                        "label": "Sets",
                        "styles": {
                          "color": "#64748b"
                        },
                        "properties": {
                          "value": "4 sets × 10 reps"
                        }
                      }
                    ]
                  }
                ]
              }
            ]
          },
          {
            "id": "b_27",
            "type": "card",
            "label": "Ex 2",
            "styles": {
              "borderRadius": 12
            },
            "properties": {},
            "children": [
              {
                "id": "b_28",
                "type": "grid",
                "label": "Row",
                "styles": {},
                "properties": {
                  "gridCols": 4
                },
                "children": [
                  {
                    "id": "b_29",
                    "type": "image",
                    "label": "Thumb",
                    "styles": {
                      "height": 60,
                      "width": 60,
                      "borderRadius": 10
                    },
                    "properties": {
                      "src": "https://images.unsplash.com/photo-1534367610401-9f5b681cc81d?w=200"
                    }
                  },
                  {
                    "id": "b_30",
                    "type": "container",
                    "label": "Info",
                    "styles": {},
                    "properties": {},
                    "children": [
                      {
                        "id": "b_31",
                        "type": "text",
                        "label": "Name",
                        "styles": {
                          "fontWeight": 700
                        },
                        "properties": {
                          "value": "Shoulder Press"
                        }
                      },
                      {
                        "id": "b_32",
                        "type": "text",
                        "label": "Sets",
                        "styles": {
                          "color": "#64748b"
                        },
                        "properties": {
                          "value": "3 sets × 12 reps"
                        }
                      }
                    ]
                  }
                ]
              }
            ]
          },
          {
            "id": "b_33",
            "type": "button",
            "label": "Start",
            "styles": {
              "backgroundColor": "#22c55e",
              "color": "#ffffff",
              "borderRadius": 12
            },
            "properties": {
              "value": "▶ Start Workout"
            }
          }
        ]
      },
      {
        "id": "page_progress",
        "name": "Progress",
        "elements": [
          {
            "id": "b_34",
            "type": "heading",
            "label": "Title",
            "styles": {
              "fontSize": 22,
              "fontWeight": 800
            },
            "properties": {
              "value": "Your Progress"
            }
          },
          {
            "id": "b_35",
            "type": "card",
            "label": "Week",
            "styles": {
              "borderRadius": 12
            },
            "properties": {},
            "children": [
              {
                "id": "b_36",
                "type": "text",
                "label": "Label",
                "styles": {
                  "fontWeight": 700
                },
                "properties": {
                  "value": "This Week"
                }
              },
              {
                "id": "b_37",
                "type": "grid",
                "label": "Days",
                "styles": {},
                "properties": {
                  "gridCols": 7
                },
                "children": [
                  {
                    "id": "b_38",
                    "type": "container",
                    "label": "M",
                    "styles": {
                      "backgroundColor": "#22c55e",
                      "borderRadius": 8,
                      "alignItems": "center"
                    },
                    "properties": {},
                    "children": [
                      {
                        "id": "b_39",
                        "type": "text",
                        "label": "D",
                        "styles": {
                          "color": "#ffffff",
                          "fontWeight": 700,
                          "textAlign": "center"
                        },
                        "properties": {
                          "value": "M"
                        }
                      }
                    ]
                  },
                  {
                    "id": "b_40",
                    "type": "container",
                    "label": "T",
                    "styles": {
                      "backgroundColor": "#22c55e",
                      "borderRadius": 8,
                      "alignItems": "center"
                    },
                    "properties": {},
                    "children": [
                      {
                        "id": "b_41",
                        "type": "text",
                        "label": "D",
                        "styles": {
                          "color": "#ffffff",
                          "fontWeight": 700,
                          "textAlign": "center"
                        },
                        "properties": {
                          "value": "T"
                        }
                      }
                    ]
                  },
                  {
                    "id": "b_42",
                    "type": "container",
                    "label": "W",
                    "styles": {
                      "backgroundColor": "#f1f5f9",
                      "borderRadius": 8,
                      "alignItems": "center"
                    },
                    "properties": {},
                    "children": [
                      {
                        "id": "b_43",
                        "type": "text",
                        "label": "D",
                        "styles": {
                          "color": "#64748b",
                          "fontWeight": 700,
                          "textAlign": "center"
                        },
                        "properties": {
                          "value": "W"
                        }
                      }
                    ]
                  },
                  {
                    "id": "b_44",
                    "type": "container",
                    "label": "T",
                    "styles": {
                      "backgroundColor": "#22c55e",
                      "borderRadius": 8,
                      "alignItems": "center"
                    },
                    "properties": {},
                    "children": [
                      {
                        "id": "b_45",
                        "type": "text",
                        "label": "D",
                        "styles": {
                          "color": "#ffffff",
                          "fontWeight": 700,
                          "textAlign": "center"
                        },
                        "properties": {
                          "value": "T"
                        }
                      }
                    ]
                  },
                  {
                    "id": "b_46",
                    "type": "container",
                    "label": "F",
                    "styles": {
                      "backgroundColor": "#f1f5f9",
                      "borderRadius": 8,
                      "alignItems": "center"
                    },
                    "properties": {},
                    "children": [
                      {
                        "id": "b_47",
                        "type": "text",
                        "label": "D",
                        "styles": {
                          "color": "#64748b",
                          "fontWeight": 700,
                          "textAlign": "center"
                        },
                        "properties": {
                          "value": "F"
                        }
                      }
                    ]
                  },
                  {
                    "id": "b_48",
                    "type": "container",
                    "label": "S",
                    "styles": {
                      "backgroundColor": "#22c55e",
                      "borderRadius": 8,
                      "alignItems": "center"
                    },
                    "properties": {},
                    "children": [
                      {
                        "id": "b_49",
                        "type": "text",
                        "label": "D",
                        "styles": {
                          "color": "#ffffff",
                          "fontWeight": 700,
                          "textAlign": "center"
                        },
                        "properties": {
                          "value": "S"
                        }
                      }
                    ]
                  },
                  {
                    "id": "b_50",
                    "type": "container",
                    "label": "S",
                    "styles": {
                      "backgroundColor": "#f1f5f9",
                      "borderRadius": 8,
                      "alignItems": "center"
                    },
                    "properties": {},
                    "children": [
                      {
                        "id": "b_51",
                        "type": "text",
                        "label": "D",
                        "styles": {
                          "color": "#64748b",
                          "fontWeight": 700,
                          "textAlign": "center"
                        },
                        "properties": {
                          "value": "S"
                        }
                      }
                    ]
                  }
                ]
              }
            ]
          },
          {
            "id": "b_52",
            "type": "heading",
            "label": "Achievements",
            "styles": {
              "fontSize": 16,
              "fontWeight": 700
            },
            "properties": {
              "value": "Achievements"
            }
          },
          {
            "id": "b_53",
            "type": "card",
            "label": "Badge 1",
            "styles": {
              "borderRadius": 12
            },
            "properties": {},
            "children": [
              {
                "id": "b_54",
                "type": "text",
                "label": "B",
                "styles": {
                  "fontWeight": 600
                },
                "properties": {
                  "value": "🏆 5-Day Streak"
                }
              }
            ]
          },
          {
            "id": "b_55",
            "type": "card",
            "label": "Badge 2",
            "styles": {
              "borderRadius": 12
            },
            "properties": {},
            "children": [
              {
                "id": "b_56",
                "type": "text",
                "label": "B",
                "styles": {
                  "fontWeight": 600
                },
                "properties": {
                  "value": "🔥 10 Workouts"
                }
              }
            ]
          }
        ]
      },
      {
        "id": "page_schedule",
        "name": "Schedule",
        "elements": [
          {
            "id": "b_57",
            "type": "heading",
            "label": "Title",
            "styles": {
              "fontSize": 22,
              "fontWeight": 800
            },
            "properties": {
              "value": "My Schedule"
            }
          },
          {
            "id": "b_58",
            "type": "card",
            "label": "Mon",
            "styles": {
              "borderRadius": 12
            },
            "properties": {},
            "children": [
              {
                "id": "b_59",
                "type": "text",
                "label": "Day",
                "styles": {
                  "fontWeight": 700,
                  "color": "#22c55e"
                },
                "properties": {
                  "value": "Mon — Upper Body, 7AM"
                }
              }
            ]
          },
          {
            "id": "b_60",
            "type": "card",
            "label": "Wed",
            "styles": {
              "borderRadius": 12
            },
            "properties": {},
            "children": [
              {
                "id": "b_61",
                "type": "text",
                "label": "Day",
                "styles": {
                  "fontWeight": 700,
                  "color": "#22c55e"
                },
                "properties": {
                  "value": "Wed — Cardio, 6:30AM"
                }
              }
            ]
          },
          {
            "id": "b_62",
            "type": "card",
            "label": "Fri",
            "styles": {
              "borderRadius": 12
            },
            "properties": {},
            "children": [
              {
                "id": "b_63",
                "type": "text",
                "label": "Day",
                "styles": {
                  "fontWeight": 700,
                  "color": "#22c55e"
                },
                "properties": {
                  "value": "Fri — Lower Body, 7AM"
                }
              }
            ]
          },
          {
            "id": "b_64",
            "type": "button",
            "label": "Add",
            "styles": {
              "backgroundColor": "#22c55e",
              "color": "#ffffff",
              "borderRadius": 10
            },
            "properties": {
              "value": "+ Add to Schedule"
            }
          }
        ]
      },
      {
        "id": "page_profile",
        "name": "Profile",
        "elements": [
          {
            "id": "b_65",
            "type": "container",
            "label": "Header",
            "styles": {
              "alignItems": "center"
            },
            "properties": {},
            "children": [
              {
                "id": "b_66",
                "type": "image",
                "label": "Avatar",
                "styles": {
                  "height": 100,
                  "width": 100,
                  "borderRadius": 50
                },
                "properties": {
                  "src": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400"
                }
              },
              {
                "id": "b_67",
                "type": "heading",
                "label": "Name",
                "styles": {
                  "fontSize": 22,
                  "fontWeight": 800,
                  "textAlign": "center"
                },
                "properties": {
                  "value": "Alex Johnson"
                }
              }
            ]
          },
          {
            "id": "b_68",
            "type": "grid",
            "label": "Stats",
            "styles": {},
            "properties": {
              "gridCols": 2
            },
            "children": [
              {
                "id": "b_69",
                "type": "container",
                "label": "Stat",
                "styles": {
                  "alignItems": "center"
                },
                "properties": {},
                "children": [
                  {
                    "id": "b_70",
                    "type": "heading",
                    "label": "Num",
                    "styles": {
                      "fontSize": 20,
                      "fontWeight": 800,
                      "color": "#22c55e",
                      "textAlign": "center"
                    },
                    "properties": {
                      "value": "47"
                    }
                  },
                  {
                    "id": "b_71",
                    "type": "text",
                    "label": "L",
                    "styles": {
                      "color": "#64748b",
                      "textAlign": "center"
                    },
                    "properties": {
                      "value": "Workouts"
                    }
                  }
                ]
              },
              {
                "id": "b_72",
                "type": "container",
                "label": "Stat",
                "styles": {
                  "alignItems": "center"
                },
                "properties": {},
                "children": [
                  {
                    "id": "b_73",
                    "type": "heading",
                    "label": "Num",
                    "styles": {
                      "fontSize": 20,
                      "fontWeight": 800,
                      "color": "#22c55e",
                      "textAlign": "center"
                    },
                    "properties": {
                      "value": "12"
                    }
                  },
                  {
                    "id": "b_74",
                    "type": "text",
                    "label": "L",
                    "styles": {
                      "color": "#64748b",
                      "textAlign": "center"
                    },
                    "properties": {
                      "value": "Goals"
                    }
                  }
                ]
              }
            ]
          },
          {
            "id": "b_75",
            "type": "heading",
            "label": "Prefs",
            "styles": {
              "fontSize": 16,
              "fontWeight": 700
            },
            "properties": {
              "value": "Preferences"
            }
          },
          {
            "id": "b_76",
            "type": "card",
            "label": "Push",
            "styles": {
              "borderRadius": 12
            },
            "properties": {},
            "children": [
              {
                "id": "b_77",
                "type": "text",
                "label": "Label",
                "styles": {
                  "fontWeight": 600
                },
                "properties": {
                  "value": "Push Notifications"
                }
              }
            ]
          }
        ]
      }
    ]
  },
  "education": {
    "name": "Education",
    "icon": "📚",
    "color": "#f59e0b",
    "description": "Online learning with courses, lessons, quizzes, and progress",
    "pages": [
      {
        "id": "page_home",
        "name": "Home",
        "elements": [
          {
            "id": "b_1",
            "type": "container",
            "label": "Hero",
            "styles": {
              "backgroundColor": "#f59e0b",
              "borderRadius": 16,
              "padding": 24
            },
            "properties": {},
            "children": [
              {
                "id": "b_2",
                "type": "heading",
                "label": "Title",
                "styles": {
                  "color": "#ffffff",
                  "fontSize": 24,
                  "fontWeight": 800
                },
                "properties": {
                  "value": "Learn\nAnything, Anywhere"
                }
              },
              {
                "id": "b_3",
                "type": "text",
                "label": "Sub",
                "styles": {
                  "color": "#fef3c7"
                },
                "properties": {
                  "value": "Expert-led courses in design, code, and business."
                }
              },
              {
                "id": "b_4",
                "type": "button",
                "label": "Browse",
                "styles": {
                  "backgroundColor": "#ffffff",
                  "color": "#f59e0b",
                  "borderRadius": 8
                },
                "properties": {
                  "value": "Browse Courses"
                }
              }
            ]
          },
          {
            "id": "b_5",
            "type": "heading",
            "label": "Categories",
            "styles": {
              "fontSize": 18,
              "fontWeight": 700
            },
            "properties": {
              "value": "Top Categories"
            }
          },
          {
            "id": "b_6",
            "type": "grid",
            "label": "Cat Grid",
            "styles": {},
            "properties": {
              "gridCols": 2
            },
            "children": [
              {
                "id": "b_7",
                "type": "card",
                "label": "Design",
                "styles": {
                  "borderRadius": 12,
                  "backgroundColor": "#f0f9ff"
                },
                "properties": {},
                "children": [
                  {
                    "id": "b_8",
                    "type": "text",
                    "label": "N",
                    "styles": {
                      "fontWeight": 700,
                      "textAlign": "center"
                    },
                    "properties": {
                      "value": "🎨 Design"
                    }
                  }
                ]
              },
              {
                "id": "b_9",
                "type": "card",
                "label": "Dev",
                "styles": {
                  "borderRadius": 12,
                  "backgroundColor": "#f0fdf4"
                },
                "properties": {},
                "children": [
                  {
                    "id": "b_10",
                    "type": "text",
                    "label": "N",
                    "styles": {
                      "fontWeight": 700,
                      "textAlign": "center"
                    },
                    "properties": {
                      "value": "💻 Dev"
                    }
                  }
                ]
              },
              {
                "id": "b_11",
                "type": "card",
                "label": "Business",
                "styles": {
                  "borderRadius": 12,
                  "backgroundColor": "#fffbeb"
                },
                "properties": {},
                "children": [
                  {
                    "id": "b_12",
                    "type": "text",
                    "label": "N",
                    "styles": {
                      "fontWeight": 700,
                      "textAlign": "center"
                    },
                    "properties": {
                      "value": "📊 Business"
                    }
                  }
                ]
              },
              {
                "id": "b_13",
                "type": "card",
                "label": "Marketing",
                "styles": {
                  "borderRadius": 12,
                  "backgroundColor": "#fef2f2"
                },
                "properties": {},
                "children": [
                  {
                    "id": "b_14",
                    "type": "text",
                    "label": "N",
                    "styles": {
                      "fontWeight": 700,
                      "textAlign": "center"
                    },
                    "properties": {
                      "value": "📣 Marketing"
                    }
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        "id": "page_courses",
        "name": "Courses",
        "elements": [
          {
            "id": "b_15",
            "type": "input",
            "label": "Search",
            "styles": {},
            "properties": {
              "placeholder": "Search courses..."
            }
          },
          {
            "id": "b_16",
            "type": "card",
            "label": "C1",
            "styles": {
              "borderRadius": 12,
              "overflow": "hidden"
            },
            "properties": {},
            "children": [
              {
                "id": "b_17",
                "type": "image",
                "label": "Thumb",
                "styles": {
                  "height": 140
                },
                "properties": {
                  "src": "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400"
                }
              },
              {
                "id": "b_18",
                "type": "container",
                "label": "Info",
                "styles": {},
                "properties": {},
                "children": [
                  {
                    "id": "b_19",
                    "type": "text",
                    "label": "Name",
                    "styles": {
                      "fontWeight": 700
                    },
                    "properties": {
                      "value": "UI/UX Design Fundamentals"
                    }
                  },
                  {
                    "id": "b_20",
                    "type": "text",
                    "label": "Meta",
                    "styles": {
                      "color": "#64748b"
                    },
                    "properties": {
                      "value": "12 lessons · Beginner"
                    }
                  },
                  {
                    "id": "b_21",
                    "type": "text",
                    "label": "Price",
                    "styles": {
                      "fontWeight": 700,
                      "color": "#f59e0b"
                    },
                    "properties": {
                      "value": "$49.99"
                    }
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        "id": "page_lesson",
        "name": "Lesson",
        "elements": [
          {
            "id": "b_22",
            "type": "container",
            "label": "Video",
            "styles": {
              "backgroundColor": "#0f172a",
              "borderRadius": 12,
              "alignItems": "center"
            },
            "properties": {},
            "children": [
              {
                "id": "b_23",
                "type": "icon",
                "label": "Play",
                "styles": {
                  "color": "#ffffff"
                },
                "properties": {
                  "iconName": "Smartphone",
                  "iconSize": 48
                }
              }
            ]
          },
          {
            "id": "b_24",
            "type": "heading",
            "label": "Title",
            "styles": {
              "fontSize": 20,
              "fontWeight": 800
            },
            "properties": {
              "value": "Design Thinking Intro"
            }
          },
          {
            "id": "b_25",
            "type": "text",
            "label": "Content",
            "styles": {
              "color": "#334155"
            },
            "properties": {
              "value": "Design thinking is a human-centered approach to innovation."
            }
          }
        ]
      },
      {
        "id": "page_quiz",
        "name": "Quiz",
        "elements": [
          {
            "id": "b_26",
            "type": "heading",
            "label": "Title",
            "styles": {
              "fontSize": 20,
              "fontWeight": 800
            },
            "properties": {
              "value": "Chapter 1 Quiz"
            }
          },
          {
            "id": "b_27",
            "type": "card",
            "label": "Q1",
            "styles": {
              "borderRadius": 12
            },
            "properties": {},
            "children": [
              {
                "id": "b_28",
                "type": "text",
                "label": "Question",
                "styles": {
                  "fontWeight": 700
                },
                "properties": {
                  "value": "1. What is the first stage of design thinking?"
                }
              },
              {
                "id": "b_29",
                "type": "button",
                "label": "A",
                "styles": {
                  "backgroundColor": "#f1f5f9",
                  "color": "#0f172a",
                  "borderRadius": 8
                },
                "properties": {
                  "value": "A. Ideate"
                }
              },
              {
                "id": "b_30",
                "type": "button",
                "label": "B",
                "styles": {
                  "backgroundColor": "#22c55e",
                  "color": "#ffffff",
                  "borderRadius": 8
                },
                "properties": {
                  "value": "B. Empathize ✓"
                }
              },
              {
                "id": "b_31",
                "type": "button",
                "label": "C",
                "styles": {
                  "backgroundColor": "#f1f5f9",
                  "color": "#0f172a",
                  "borderRadius": 8
                },
                "properties": {
                  "value": "C. Prototype"
                }
              }
            ]
          },
          {
            "id": "b_32",
            "type": "button",
            "label": "Submit",
            "styles": {
              "backgroundColor": "#f59e0b",
              "color": "#ffffff",
              "borderRadius": 10
            },
            "properties": {
              "value": "Submit Quiz"
            },
            "actions": {
              "onClick": {
                "type": "toast",
                "toastText": "Score: 4/5"
              }
            }
          }
        ]
      },
      {
        "id": "page_progress",
        "name": "My Learning",
        "elements": [
          {
            "id": "b_33",
            "type": "heading",
            "label": "Title",
            "styles": {
              "fontSize": 22,
              "fontWeight": 800
            },
            "properties": {
              "value": "My Learning"
            }
          },
          {
            "id": "b_34",
            "type": "card",
            "label": "C1",
            "styles": {
              "borderRadius": 12
            },
            "properties": {},
            "children": [
              {
                "id": "b_35",
                "type": "text",
                "label": "Name",
                "styles": {
                  "fontWeight": 700
                },
                "properties": {
                  "value": "UI/UX Design — 45%"
                }
              },
              {
                "id": "b_36",
                "type": "container",
                "label": "Bar",
                "styles": {
                  "backgroundColor": "#f1f5f9",
                  "borderRadius": 10,
                  "height": 8
                },
                "properties": {},
                "children": [
                  {
                    "id": "b_37",
                    "type": "container",
                    "label": "Fill",
                    "styles": {
                      "backgroundColor": "#f59e0b",
                      "borderRadius": 10,
                      "height": 8,
                      "width": "45%"
                    },
                    "properties": {}
                  }
                ]
              }
            ]
          },
          {
            "id": "b_38",
            "type": "card",
            "label": "C2",
            "styles": {
              "borderRadius": 12
            },
            "properties": {},
            "children": [
              {
                "id": "b_39",
                "type": "text",
                "label": "Name",
                "styles": {
                  "fontWeight": 700
                },
                "properties": {
                  "value": "React Native — 72%"
                }
              },
              {
                "id": "b_40",
                "type": "container",
                "label": "Bar",
                "styles": {
                  "backgroundColor": "#f1f5f9",
                  "borderRadius": 10,
                  "height": 8
                },
                "properties": {},
                "children": [
                  {
                    "id": "b_41",
                    "type": "container",
                    "label": "Fill",
                    "styles": {
                      "backgroundColor": "#22c55e",
                      "borderRadius": 10,
                      "height": 8,
                      "width": "72%"
                    },
                    "properties": {}
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  "realestate": {
    "name": "Real Estate",
    "icon": "🏠",
    "color": "#8b5cf6",
    "description": "Property listing app with search, details, and agent contact",
    "pages": [
      {
        "id": "page_home",
        "name": "Home",
        "elements": [
          {
            "id": "b_1",
            "type": "container",
            "label": "Search Hero",
            "styles": {
              "backgroundColor": "#8b5cf6",
              "borderRadius": 16,
              "padding": 24
            },
            "properties": {},
            "children": [
              {
                "id": "b_2",
                "type": "heading",
                "label": "Title",
                "styles": {
                  "color": "#ffffff",
                  "fontSize": 24,
                  "fontWeight": 800
                },
                "properties": {
                  "value": "Find Your\nDream Home"
                }
              },
              {
                "id": "b_3",
                "type": "input",
                "label": "Search",
                "styles": {},
                "properties": {
                  "placeholder": "Search by city..."
                }
              }
            ]
          },
          {
            "id": "b_4",
            "type": "heading",
            "label": "Featured",
            "styles": {
              "fontSize": 18,
              "fontWeight": 700
            },
            "properties": {
              "value": "Featured Properties"
            }
          },
          {
            "id": "b_5",
            "type": "card",
            "label": "P1",
            "styles": {
              "borderRadius": 12,
              "overflow": "hidden"
            },
            "properties": {},
            "children": [
              {
                "id": "b_6",
                "type": "image",
                "label": "Photo",
                "styles": {
                  "height": 180
                },
                "properties": {
                  "src": "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400"
                }
              },
              {
                "id": "b_7",
                "type": "container",
                "label": "Details",
                "styles": {},
                "properties": {},
                "children": [
                  {
                    "id": "b_8",
                    "type": "heading",
                    "label": "Price",
                    "styles": {
                      "fontSize": 18,
                      "fontWeight": 800,
                      "color": "#8b5cf6"
                    },
                    "properties": {
                      "value": "$450,000"
                    }
                  },
                  {
                    "id": "b_9",
                    "type": "text",
                    "label": "Addr",
                    "styles": {
                      "fontWeight": 600
                    },
                    "properties": {
                      "value": "123 Maple Street"
                    }
                  },
                  {
                    "id": "b_10",
                    "type": "text",
                    "label": "Specs",
                    "styles": {
                      "color": "#64748b"
                    },
                    "properties": {
                      "value": "3 bed · 2 bath · 1,800 sqft"
                    }
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        "id": "page_properties",
        "name": "Properties",
        "elements": [
          {
            "id": "b_11",
            "type": "input",
            "label": "Search",
            "styles": {},
            "properties": {
              "placeholder": "Search properties..."
            }
          },
          {
            "id": "b_12",
            "type": "grid",
            "label": "Filters",
            "styles": {},
            "properties": {
              "gridCols": 4
            },
            "children": [
              {
                "id": "b_13",
                "type": "button",
                "label": "Sale",
                "styles": {
                  "backgroundColor": "#8b5cf6",
                  "color": "#ffffff",
                  "borderRadius": 20
                },
                "properties": {
                  "value": "For Sale"
                }
              },
              {
                "id": "b_14",
                "type": "button",
                "label": "Rent",
                "styles": {
                  "backgroundColor": "#f1f5f9",
                  "color": "#0f172a",
                  "borderRadius": 20
                },
                "properties": {
                  "value": "For Rent"
                }
              },
              {
                "id": "b_15",
                "type": "button",
                "label": "New",
                "styles": {
                  "backgroundColor": "#f1f5f9",
                  "color": "#0f172a",
                  "borderRadius": 20
                },
                "properties": {
                  "value": "New"
                }
              },
              {
                "id": "b_16",
                "type": "button",
                "label": "Sold",
                "styles": {
                  "backgroundColor": "#f1f5f9",
                  "color": "#0f172a",
                  "borderRadius": 20
                },
                "properties": {
                  "value": "Sold"
                }
              }
            ]
          },
          {
            "id": "b_17",
            "type": "card",
            "label": "P1",
            "styles": {
              "borderRadius": 12,
              "overflow": "hidden"
            },
            "properties": {},
            "children": [
              {
                "id": "b_18",
                "type": "image",
                "label": "Photo",
                "styles": {
                  "height": 160
                },
                "properties": {
                  "src": "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400"
                }
              },
              {
                "id": "b_19",
                "type": "container",
                "label": "Details",
                "styles": {},
                "properties": {},
                "children": [
                  {
                    "id": "b_20",
                    "type": "text",
                    "label": "Price",
                    "styles": {
                      "fontWeight": 800,
                      "color": "#8b5cf6"
                    },
                    "properties": {
                      "value": "$450,000"
                    }
                  },
                  {
                    "id": "b_21",
                    "type": "text",
                    "label": "Addr",
                    "styles": {
                      "fontWeight": 600
                    },
                    "properties": {
                      "value": "123 Maple St"
                    }
                  },
                  {
                    "id": "b_22",
                    "type": "text",
                    "label": "Specs",
                    "styles": {
                      "color": "#64748b"
                    },
                    "properties": {
                      "value": "3 bed · 2 bath"
                    }
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        "id": "page_property_detail",
        "name": "Property Detail",
        "elements": [
          {
            "id": "b_23",
            "type": "image",
            "label": "Hero",
            "styles": {
              "height": 260,
              "borderRadius": 16
            },
            "properties": {
              "src": "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600"
            }
          },
          {
            "id": "b_24",
            "type": "heading",
            "label": "Price",
            "styles": {
              "fontSize": 24,
              "fontWeight": 800,
              "color": "#8b5cf6"
            },
            "properties": {
              "value": "$450,000"
            }
          },
          {
            "id": "b_25",
            "type": "text",
            "label": "Addr",
            "styles": {
              "fontWeight": 600
            },
            "properties": {
              "value": "123 Maple Street"
            }
          },
          {
            "id": "b_26",
            "type": "text",
            "label": "Desc",
            "styles": {
              "color": "#64748b"
            },
            "properties": {
              "value": "Beautiful family home with updated kitchen, hardwood floors, and spacious backyard."
            }
          },
          {
            "id": "b_27",
            "type": "button",
            "label": "Contact",
            "styles": {
              "backgroundColor": "#8b5cf6",
              "color": "#ffffff",
              "borderRadius": 12
            },
            "properties": {
              "value": "Contact Agent"
            }
          }
        ]
      },
      {
        "id": "page_agent",
        "name": "Agent Profile",
        "elements": [
          {
            "id": "b_28",
            "type": "container",
            "label": "Header",
            "styles": {
              "alignItems": "center"
            },
            "properties": {},
            "children": [
              {
                "id": "b_29",
                "type": "image",
                "label": "Photo",
                "styles": {
                  "height": 120,
                  "width": 120,
                  "borderRadius": 60
                },
                "properties": {
                  "src": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400"
                }
              },
              {
                "id": "b_30",
                "type": "heading",
                "label": "Name",
                "styles": {
                  "fontSize": 22,
                  "fontWeight": 800,
                  "textAlign": "center"
                },
                "properties": {
                  "value": "Sarah Johnson"
                }
              },
              {
                "id": "b_31",
                "type": "text",
                "label": "Role",
                "styles": {
                  "color": "#64748b",
                  "textAlign": "center"
                },
                "properties": {
                  "value": "Senior Agent"
                }
              }
            ]
          },
          {
            "id": "b_32",
            "type": "card",
            "label": "Phone",
            "styles": {
              "borderRadius": 12
            },
            "properties": {},
            "children": [
              {
                "id": "b_33",
                "type": "text",
                "label": "P",
                "styles": {
                  "fontWeight": 600
                },
                "properties": {
                  "value": "📞 (555) 123-4567"
                }
              }
            ]
          },
          {
            "id": "b_34",
            "type": "card",
            "label": "Email",
            "styles": {
              "borderRadius": 12
            },
            "properties": {},
            "children": [
              {
                "id": "b_35",
                "type": "text",
                "label": "E",
                "styles": {
                  "fontWeight": 600
                },
                "properties": {
                  "value": "✉️ sarah@realty.com"
                }
              }
            ]
          }
        ]
      },
      {
        "id": "page_saved",
        "name": "Saved",
        "elements": [
          {
            "id": "b_36",
            "type": "heading",
            "label": "Title",
            "styles": {
              "fontSize": 22,
              "fontWeight": 800
            },
            "properties": {
              "value": "Saved Properties"
            }
          },
          {
            "id": "b_37",
            "type": "card",
            "label": "S1",
            "styles": {
              "borderRadius": 12,
              "overflow": "hidden"
            },
            "properties": {},
            "children": [
              {
                "id": "b_38",
                "type": "image",
                "label": "Photo",
                "styles": {
                  "height": 140
                },
                "properties": {
                  "src": "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400"
                }
              },
              {
                "id": "b_39",
                "type": "container",
                "label": "Info",
                "styles": {},
                "properties": {},
                "children": [
                  {
                    "id": "b_40",
                    "type": "text",
                    "label": "Price",
                    "styles": {
                      "fontWeight": 800,
                      "color": "#8b5cf6"
                    },
                    "properties": {
                      "value": "$450,000"
                    }
                  },
                  {
                    "id": "b_41",
                    "type": "text",
                    "label": "Addr",
                    "styles": {
                      "fontWeight": 600
                    },
                    "properties": {
                      "value": "123 Maple St"
                    }
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  "entertainment": {
    "name": "Entertainment",
    "icon": "🎬",
    "color": "#ec4899",
    "description": "Events and entertainment app with listings, tickets, and schedules",
    "pages": [
      {
        "id": "page_home",
        "name": "Home",
        "elements": [
          {
            "id": "b_1",
            "type": "image",
            "label": "Hero",
            "styles": {
              "height": 200,
              "borderRadius": 16
            },
            "properties": {
              "src": "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600"
            }
          },
          {
            "id": "b_2",
            "type": "heading",
            "label": "Title",
            "styles": {
              "fontSize": 22,
              "fontWeight": 800
            },
            "properties": {
              "value": "What's On Tonight?"
            }
          },
          {
            "id": "b_3",
            "type": "text",
            "label": "Sub",
            "styles": {
              "color": "#64748b"
            },
            "properties": {
              "value": "Discover concerts, shows, and events near you."
            }
          },
          {
            "id": "b_4",
            "type": "grid",
            "label": "Categories",
            "styles": {},
            "properties": {
              "gridCols": 4
            },
            "children": [
              {
                "id": "b_5",
                "type": "card",
                "label": "Music",
                "styles": {
                  "borderRadius": 10,
                  "alignItems": "center"
                },
                "properties": {},
                "children": [
                  {
                    "id": "b_6",
                    "type": "text",
                    "label": "N",
                    "styles": {
                      "fontWeight": 700,
                      "color": "#ec4899",
                      "textAlign": "center"
                    },
                    "properties": {
                      "value": "🎵"
                    }
                  }
                ]
              },
              {
                "id": "b_7",
                "type": "card",
                "label": "Sports",
                "styles": {
                  "borderRadius": 10,
                  "alignItems": "center"
                },
                "properties": {},
                "children": [
                  {
                    "id": "b_8",
                    "type": "text",
                    "label": "N",
                    "styles": {
                      "fontWeight": 700,
                      "color": "#ec4899",
                      "textAlign": "center"
                    },
                    "properties": {
                      "value": "⚽"
                    }
                  }
                ]
              },
              {
                "id": "b_9",
                "type": "card",
                "label": "Comedy",
                "styles": {
                  "borderRadius": 10,
                  "alignItems": "center"
                },
                "properties": {},
                "children": [
                  {
                    "id": "b_10",
                    "type": "text",
                    "label": "N",
                    "styles": {
                      "fontWeight": 700,
                      "color": "#ec4899",
                      "textAlign": "center"
                    },
                    "properties": {
                      "value": "😂"
                    }
                  }
                ]
              },
              {
                "id": "b_11",
                "type": "card",
                "label": "Theater",
                "styles": {
                  "borderRadius": 10,
                  "alignItems": "center"
                },
                "properties": {},
                "children": [
                  {
                    "id": "b_12",
                    "type": "text",
                    "label": "N",
                    "styles": {
                      "fontWeight": 700,
                      "color": "#ec4899",
                      "textAlign": "center"
                    },
                    "properties": {
                      "value": "🎭"
                    }
                  }
                ]
              }
            ]
          },
          {
            "id": "b_13",
            "type": "card",
            "label": "Event",
            "styles": {
              "borderRadius": 12,
              "overflow": "hidden"
            },
            "properties": {},
            "children": [
              {
                "id": "b_14",
                "type": "image",
                "label": "Img",
                "styles": {
                  "height": 160
                },
                "properties": {
                  "src": "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400"
                }
              },
              {
                "id": "b_15",
                "type": "container",
                "label": "Info",
                "styles": {},
                "properties": {},
                "children": [
                  {
                    "id": "b_16",
                    "type": "text",
                    "label": "Name",
                    "styles": {
                      "fontWeight": 700
                    },
                    "properties": {
                      "value": "Summer Music Festival"
                    }
                  },
                  {
                    "id": "b_17",
                    "type": "text",
                    "label": "Meta",
                    "styles": {
                      "color": "#64748b"
                    },
                    "properties": {
                      "value": "Aug 15 · Central Park"
                    }
                  },
                  {
                    "id": "b_18",
                    "type": "text",
                    "label": "Price",
                    "styles": {
                      "fontWeight": 700,
                      "color": "#ec4899"
                    },
                    "properties": {
                      "value": "From $49"
                    }
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        "id": "page_events",
        "name": "Events",
        "elements": [
          {
            "id": "b_19",
            "type": "input",
            "label": "Search",
            "styles": {},
            "properties": {
              "placeholder": "Search events..."
            }
          },
          {
            "id": "b_20",
            "type": "card",
            "label": "E1",
            "styles": {
              "borderRadius": 12
            },
            "properties": {},
            "children": [
              {
                "id": "b_21",
                "type": "grid",
                "label": "Row",
                "styles": {},
                "properties": {
                  "gridCols": 4
                },
                "children": [
                  {
                    "id": "b_22",
                    "type": "container",
                    "label": "Date",
                    "styles": {
                      "backgroundColor": "#fce7f3",
                      "borderRadius": 10,
                      "alignItems": "center"
                    },
                    "properties": {},
                    "children": [
                      {
                        "id": "b_23",
                        "type": "text",
                        "label": "Month",
                        "styles": {
                          "color": "#ec4899",
                          "fontWeight": 700,
                          "textAlign": "center"
                        },
                        "properties": {
                          "value": "AUG"
                        }
                      },
                      {
                        "id": "b_24",
                        "type": "text",
                        "label": "Day",
                        "styles": {
                          "color": "#ec4899",
                          "fontWeight": 800,
                          "fontSize": 18,
                          "textAlign": "center"
                        },
                        "properties": {
                          "value": "15"
                        }
                      }
                    ]
                  },
                  {
                    "id": "b_25",
                    "type": "container",
                    "label": "Info",
                    "styles": {},
                    "properties": {},
                    "children": [
                      {
                        "id": "b_26",
                        "type": "text",
                        "label": "Name",
                        "styles": {
                          "fontWeight": 700
                        },
                        "properties": {
                          "value": "Summer Festival"
                        }
                      },
                      {
                        "id": "b_27",
                        "type": "text",
                        "label": "Venue",
                        "styles": {
                          "color": "#64748b"
                        },
                        "properties": {
                          "value": "Central Park"
                        }
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        "id": "page_event_detail",
        "name": "Event Detail",
        "elements": [
          {
            "id": "b_28",
            "type": "image",
            "label": "Hero",
            "styles": {
              "height": 240,
              "borderRadius": 16
            },
            "properties": {
              "src": "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600"
            }
          },
          {
            "id": "b_29",
            "type": "heading",
            "label": "Name",
            "styles": {
              "fontSize": 22,
              "fontWeight": 800
            },
            "properties": {
              "value": "Summer Music Festival"
            }
          },
          {
            "id": "b_30",
            "type": "text",
            "label": "Meta",
            "styles": {
              "color": "#64748b"
            },
            "properties": {
              "value": "Aug 15, 3:00 PM · Central Park"
            }
          },
          {
            "id": "b_31",
            "type": "text",
            "label": "Desc",
            "styles": {
              "color": "#334155"
            },
            "properties": {
              "value": "Join us for an incredible day of live music, food, and fun!"
            }
          },
          {
            "id": "b_32",
            "type": "button",
            "label": "Tickets",
            "styles": {
              "backgroundColor": "#ec4899",
              "color": "#ffffff",
              "borderRadius": 12
            },
            "properties": {
              "value": "Get Tickets — $49"
            }
          }
        ]
      },
      {
        "id": "page_schedule",
        "name": "Schedule",
        "elements": [
          {
            "id": "b_33",
            "type": "heading",
            "label": "Title",
            "styles": {
              "fontSize": 22,
              "fontWeight": 800
            },
            "properties": {
              "value": "Event Schedule"
            }
          },
          {
            "id": "b_34",
            "type": "card",
            "label": "Slot 1",
            "styles": {
              "borderRadius": 12
            },
            "properties": {},
            "children": [
              {
                "id": "b_35",
                "type": "text",
                "label": "Time",
                "styles": {
                  "fontWeight": 700,
                  "color": "#ec4899"
                },
                "properties": {
                  "value": "3:00 PM — DJ Set"
                }
              }
            ]
          },
          {
            "id": "b_36",
            "type": "card",
            "label": "Slot 2",
            "styles": {
              "borderRadius": 12
            },
            "properties": {},
            "children": [
              {
                "id": "b_37",
                "type": "text",
                "label": "Time",
                "styles": {
                  "fontWeight": 700,
                  "color": "#ec4899"
                },
                "properties": {
                  "value": "5:00 PM — Live Band"
                }
              }
            ]
          },
          {
            "id": "b_38",
            "type": "card",
            "label": "Slot 3",
            "styles": {
              "borderRadius": 12
            },
            "properties": {},
            "children": [
              {
                "id": "b_39",
                "type": "text",
                "label": "Time",
                "styles": {
                  "fontWeight": 700,
                  "color": "#ec4899"
                },
                "properties": {
                  "value": "8:00 PM — Headliner"
                }
              }
            ]
          }
        ]
      },
      {
        "id": "page_tickets",
        "name": "My Tickets",
        "elements": [
          {
            "id": "b_40",
            "type": "heading",
            "label": "Title",
            "styles": {
              "fontSize": 22,
              "fontWeight": 800
            },
            "properties": {
              "value": "My Tickets"
            }
          },
          {
            "id": "b_41",
            "type": "card",
            "label": "T1",
            "styles": {
              "borderRadius": 12,
              "backgroundColor": "#fce7f3"
            },
            "properties": {},
            "children": [
              {
                "id": "b_42",
                "type": "text",
                "label": "Name",
                "styles": {
                  "fontWeight": 700
                },
                "properties": {
                  "value": "🎵 Summer Music Festival"
                }
              },
              {
                "id": "b_43",
                "type": "text",
                "label": "Date",
                "styles": {
                  "color": "#64748b"
                },
                "properties": {
                  "value": "Aug 15, 3:00 PM"
                }
              },
              {
                "id": "b_44",
                "type": "text",
                "label": "Qty",
                "styles": {
                  "fontWeight": 600
                },
                "properties": {
                  "value": "2 tickets · GA"
                }
              }
            ]
          }
        ]
      }
    ]
  },
  "travel": {
    "name": "Travel",
    "icon": "✈️",
    "color": "#06b6d4",
    "description": "Travel booking app with destinations, hotels, and itineraries",
    "pages": [
      {
        "id": "page_home",
        "name": "Home",
        "elements": [
          {
            "id": "b_1",
            "type": "image",
            "label": "Hero",
            "styles": {
              "height": 240,
              "borderRadius": 16
            },
            "properties": {
              "src": "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=600"
            }
          },
          {
            "id": "b_2",
            "type": "heading",
            "label": "Title",
            "styles": {
              "fontSize": 26,
              "fontWeight": 800
            },
            "properties": {
              "value": "Where to Next?"
            }
          },
          {
            "id": "b_3",
            "type": "input",
            "label": "Search",
            "styles": {},
            "properties": {
              "placeholder": "Search destinations..."
            }
          },
          {
            "id": "b_4",
            "type": "heading",
            "label": "Popular",
            "styles": {
              "fontSize": 18,
              "fontWeight": 700
            },
            "properties": {
              "value": "Popular Destinations"
            }
          },
          {
            "id": "b_5",
            "type": "grid",
            "label": "Grid",
            "styles": {},
            "properties": {
              "gridCols": 2
            },
            "children": [
              {
                "id": "b_6",
                "type": "card",
                "label": "Paris",
                "styles": {
                  "borderRadius": 12,
                  "overflow": "hidden"
                },
                "properties": {},
                "children": [
                  {
                    "id": "b_7",
                    "type": "image",
                    "label": "Photo",
                    "styles": {
                      "height": 120
                    },
                    "properties": {
                      "src": "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400"
                    }
                  },
                  {
                    "id": "b_8",
                    "type": "text",
                    "label": "Name",
                    "styles": {
                      "fontWeight": 700,
                      "padding": 8
                    },
                    "properties": {
                      "value": "Paris"
                    }
                  }
                ]
              },
              {
                "id": "b_9",
                "type": "card",
                "label": "Tokyo",
                "styles": {
                  "borderRadius": 12,
                  "overflow": "hidden"
                },
                "properties": {},
                "children": [
                  {
                    "id": "b_10",
                    "type": "image",
                    "label": "Photo",
                    "styles": {
                      "height": 120
                    },
                    "properties": {
                      "src": "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400"
                    }
                  },
                  {
                    "id": "b_11",
                    "type": "text",
                    "label": "Name",
                    "styles": {
                      "fontWeight": 700,
                      "padding": 8
                    },
                    "properties": {
                      "value": "Tokyo"
                    }
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        "id": "page_destinations",
        "name": "Destinations",
        "elements": [
          {
            "id": "b_12",
            "type": "input",
            "label": "Search",
            "styles": {},
            "properties": {
              "placeholder": "Search destinations..."
            }
          },
          {
            "id": "b_13",
            "type": "card",
            "label": "D1",
            "styles": {
              "borderRadius": 12,
              "overflow": "hidden"
            },
            "properties": {},
            "children": [
              {
                "id": "b_14",
                "type": "image",
                "label": "Photo",
                "styles": {
                  "height": 160
                },
                "properties": {
                  "src": "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400"
                }
              },
              {
                "id": "b_15",
                "type": "container",
                "label": "Info",
                "styles": {},
                "properties": {},
                "children": [
                  {
                    "id": "b_16",
                    "type": "text",
                    "label": "Name",
                    "styles": {
                      "fontWeight": 700
                    },
                    "properties": {
                      "value": "Paris, France"
                    }
                  },
                  {
                    "id": "b_17",
                    "type": "text",
                    "label": "Price",
                    "styles": {
                      "color": "#06b6d4",
                      "fontWeight": 700
                    },
                    "properties": {
                      "value": "From $599"
                    }
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        "id": "page_hotel_detail",
        "name": "Hotel Detail",
        "elements": [
          {
            "id": "b_18",
            "type": "image",
            "label": "Photos",
            "styles": {
              "height": 240,
              "borderRadius": 16
            },
            "properties": {
              "src": "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600"
            }
          },
          {
            "id": "b_19",
            "type": "heading",
            "label": "Name",
            "styles": {
              "fontSize": 22,
              "fontWeight": 800
            },
            "properties": {
              "value": "Grand Hotel Paris"
            }
          },
          {
            "id": "b_20",
            "type": "text",
            "label": "Rating",
            "styles": {
              "color": "#f59e0b"
            },
            "properties": {
              "value": "★★★★★ 4.9"
            }
          },
          {
            "id": "b_21",
            "type": "text",
            "label": "Desc",
            "styles": {
              "color": "#64748b"
            },
            "properties": {
              "value": "Luxury 5-star hotel in the heart of Paris with Eiffel Tower views."
            }
          },
          {
            "id": "b_22",
            "type": "button",
            "label": "Book",
            "styles": {
              "backgroundColor": "#06b6d4",
              "color": "#ffffff",
              "borderRadius": 12
            },
            "properties": {
              "value": "Book Now — $299/night"
            }
          }
        ]
      },
      {
        "id": "page_booking",
        "name": "Booking",
        "elements": [
          {
            "id": "b_23",
            "type": "heading",
            "label": "Title",
            "styles": {
              "fontSize": 22,
              "fontWeight": 800
            },
            "properties": {
              "value": "Book Your Stay"
            }
          },
          {
            "id": "b_24",
            "type": "input",
            "label": "Check In",
            "styles": {},
            "properties": {
              "placeholder": "Check-in Date"
            }
          },
          {
            "id": "b_25",
            "type": "input",
            "label": "Check Out",
            "styles": {},
            "properties": {
              "placeholder": "Check-out Date"
            }
          },
          {
            "id": "b_26",
            "type": "input",
            "label": "Guests",
            "styles": {},
            "properties": {
              "placeholder": "Number of Guests"
            }
          },
          {
            "id": "b_27",
            "type": "button",
            "label": "Confirm",
            "styles": {
              "backgroundColor": "#06b6d4",
              "color": "#ffffff",
              "borderRadius": 12
            },
            "properties": {
              "value": "Confirm Booking"
            },
            "actions": {
              "onClick": {
                "type": "toast",
                "toastText": "Booking confirmed!"
              }
            }
          }
        ]
      },
      {
        "id": "page_itinerary",
        "name": "Itinerary",
        "elements": [
          {
            "id": "b_28",
            "type": "heading",
            "label": "Title",
            "styles": {
              "fontSize": 22,
              "fontWeight": 800
            },
            "properties": {
              "value": "My Trip"
            }
          },
          {
            "id": "b_29",
            "type": "card",
            "label": "Day 1",
            "styles": {
              "borderRadius": 12,
              "backgroundColor": "#ecfeff"
            },
            "properties": {},
            "children": [
              {
                "id": "b_30",
                "type": "text",
                "label": "Day",
                "styles": {
                  "fontWeight": 700,
                  "color": "#06b6d4"
                },
                "properties": {
                  "value": "Day 1 — Arrival"
                }
              },
              {
                "id": "b_31",
                "type": "text",
                "label": "Activities",
                "styles": {
                  "color": "#64748b"
                },
                "properties": {
                  "value": "Check in · Walk the Seine · Dinner"
                }
              }
            ]
          },
          {
            "id": "b_32",
            "type": "card",
            "label": "Day 2",
            "styles": {
              "borderRadius": 12,
              "backgroundColor": "#ecfeff"
            },
            "properties": {},
            "children": [
              {
                "id": "b_33",
                "type": "text",
                "label": "Day",
                "styles": {
                  "fontWeight": 700,
                  "color": "#06b6d4"
                },
                "properties": {
                  "value": "Day 2 — Explore"
                }
              },
              {
                "id": "b_34",
                "type": "text",
                "label": "Activities",
                "styles": {
                  "color": "#64748b"
                },
                "properties": {
                  "value": "Louvre · Lunch · Eiffel Tower"
                }
              }
            ]
          }
        ]
      }
    ]
  },
  "portfolio": {
    "name": "Portfolio",
    "icon": "🎨",
    "color": "#f97316",
    "description": "Creative portfolio with gallery, projects, and contact",
    "pages": [
      {
        "id": "page_home",
        "name": "Home",
        "elements": [
          {
            "id": "b_1",
            "type": "container",
            "label": "Hero",
            "styles": {
              "backgroundColor": "#0f172a",
              "borderRadius": 20,
              "padding": 32,
              "alignItems": "center"
            },
            "properties": {},
            "children": [
              {
                "id": "b_2",
                "type": "image",
                "label": "Avatar",
                "styles": {
                  "height": 120,
                  "width": 120,
                  "borderRadius": 60
                },
                "properties": {
                  "src": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400"
                }
              },
              {
                "id": "b_3",
                "type": "heading",
                "label": "Name",
                "styles": {
                  "color": "#ffffff",
                  "fontSize": 26,
                  "fontWeight": 800,
                  "textAlign": "center"
                },
                "properties": {
                  "value": "Alex Rivera"
                }
              },
              {
                "id": "b_4",
                "type": "text",
                "label": "Title",
                "styles": {
                  "color": "#94a3b8",
                  "textAlign": "center"
                },
                "properties": {
                  "value": "UI/UX Designer & Developer"
                }
              }
            ]
          },
          {
            "id": "b_5",
            "type": "heading",
            "label": "Projects",
            "styles": {
              "fontSize": 20,
              "fontWeight": 700
            },
            "properties": {
              "value": "Featured Work"
            }
          },
          {
            "id": "b_6",
            "type": "grid",
            "label": "Grid",
            "styles": {},
            "properties": {
              "gridCols": 2
            },
            "children": [
              {
                "id": "b_7",
                "type": "card",
                "label": "P1",
                "styles": {
                  "borderRadius": 12,
                  "overflow": "hidden"
                },
                "properties": {},
                "children": [
                  {
                    "id": "b_8",
                    "type": "image",
                    "label": "Thumb",
                    "styles": {
                      "height": 140
                    },
                    "properties": {
                      "src": "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400"
                    }
                  },
                  {
                    "id": "b_9",
                    "type": "text",
                    "label": "Name",
                    "styles": {
                      "fontWeight": 700,
                      "padding": 8
                    },
                    "properties": {
                      "value": "Project One"
                    }
                  }
                ]
              },
              {
                "id": "b_10",
                "type": "card",
                "label": "P2",
                "styles": {
                  "borderRadius": 12,
                  "overflow": "hidden"
                },
                "properties": {},
                "children": [
                  {
                    "id": "b_11",
                    "type": "image",
                    "label": "Thumb",
                    "styles": {
                      "height": 140
                    },
                    "properties": {
                      "src": "https://images.unsplash.com/photo-1559028012-481c04fa702d?w=400"
                    }
                  },
                  {
                    "id": "b_12",
                    "type": "text",
                    "label": "Name",
                    "styles": {
                      "fontWeight": 700,
                      "padding": 8
                    },
                    "properties": {
                      "value": "Project Two"
                    }
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        "id": "page_gallery",
        "name": "Gallery",
        "elements": [
          {
            "id": "b_13",
            "type": "heading",
            "label": "Title",
            "styles": {
              "fontSize": 22,
              "fontWeight": 800
            },
            "properties": {
              "value": "Gallery"
            }
          },
          {
            "id": "b_14",
            "type": "grid",
            "label": "Grid",
            "styles": {},
            "properties": {
              "gridCols": 2
            },
            "children": [
              {
                "id": "b_15",
                "type": "image",
                "label": "Img 1",
                "styles": {
                  "height": 160,
                  "borderRadius": 12
                },
                "properties": {
                  "src": "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400"
                }
              },
              {
                "id": "b_16",
                "type": "image",
                "label": "Img 2",
                "styles": {
                  "height": 160,
                  "borderRadius": 12
                },
                "properties": {
                  "src": "https://images.unsplash.com/photo-1559028012-481c04fa702d?w=400"
                }
              },
              {
                "id": "b_17",
                "type": "image",
                "label": "Img 3",
                "styles": {
                  "height": 160,
                  "borderRadius": 12
                },
                "properties": {
                  "src": "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400"
                }
              },
              {
                "id": "b_18",
                "type": "image",
                "label": "Img 4",
                "styles": {
                  "height": 160,
                  "borderRadius": 12
                },
                "properties": {
                  "src": "https://images.unsplash.com/photo-1512758017271-d7b84c2113f1?w=400"
                }
              }
            ]
          }
        ]
      },
      {
        "id": "page_project_detail",
        "name": "Project Detail",
        "elements": [
          {
            "id": "b_19",
            "type": "image",
            "label": "Hero",
            "styles": {
              "height": 240,
              "borderRadius": 16
            },
            "properties": {
              "src": "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600"
            }
          },
          {
            "id": "b_20",
            "type": "heading",
            "label": "Name",
            "styles": {
              "fontSize": 22,
              "fontWeight": 800
            },
            "properties": {
              "value": "Project One"
            }
          },
          {
            "id": "b_21",
            "type": "text",
            "label": "Role",
            "styles": {
              "color": "#f97316",
              "fontWeight": 600
            },
            "properties": {
              "value": "UI/UX Design · 2024"
            }
          },
          {
            "id": "b_22",
            "type": "text",
            "label": "Desc",
            "styles": {
              "color": "#64748b"
            },
            "properties": {
              "value": "A complete redesign of a SaaS platform focusing on user experience and modern design patterns."
            }
          }
        ]
      },
      {
        "id": "page_about",
        "name": "About",
        "elements": [
          {
            "id": "b_23",
            "type": "heading",
            "label": "Title",
            "styles": {
              "fontSize": 24,
              "fontWeight": 800
            },
            "properties": {
              "value": "About Me"
            }
          },
          {
            "id": "b_24",
            "type": "text",
            "label": "Bio",
            "styles": {
              "color": "#64748b"
            },
            "properties": {
              "value": "I am a designer and developer with 5+ years of experience creating digital products for startups and enterprises."
            }
          },
          {
            "id": "b_25",
            "type": "heading",
            "label": "Skills",
            "styles": {
              "fontSize": 16,
              "fontWeight": 700
            },
            "properties": {
              "value": "Skills"
            }
          },
          {
            "id": "b_26",
            "type": "grid",
            "label": "Skills",
            "styles": {},
            "properties": {
              "gridCols": 2
            },
            "children": [
              {
                "id": "b_27",
                "type": "card",
                "label": "S1",
                "styles": {
                  "borderRadius": 10
                },
                "properties": {},
                "children": [
                  {
                    "id": "b_28",
                    "type": "text",
                    "label": "N",
                    "styles": {
                      "fontWeight": 600,
                      "textAlign": "center"
                    },
                    "properties": {
                      "value": "Figma"
                    }
                  }
                ]
              },
              {
                "id": "b_29",
                "type": "card",
                "label": "S2",
                "styles": {
                  "borderRadius": 10
                },
                "properties": {},
                "children": [
                  {
                    "id": "b_30",
                    "type": "text",
                    "label": "N",
                    "styles": {
                      "fontWeight": 600,
                      "textAlign": "center"
                    },
                    "properties": {
                      "value": "React"
                    }
                  }
                ]
              },
              {
                "id": "b_31",
                "type": "card",
                "label": "S3",
                "styles": {
                  "borderRadius": 10
                },
                "properties": {},
                "children": [
                  {
                    "id": "b_32",
                    "type": "text",
                    "label": "N",
                    "styles": {
                      "fontWeight": 600,
                      "textAlign": "center"
                    },
                    "properties": {
                      "value": "Swift"
                    }
                  }
                ]
              },
              {
                "id": "b_33",
                "type": "card",
                "label": "S4",
                "styles": {
                  "borderRadius": 10
                },
                "properties": {},
                "children": [
                  {
                    "id": "b_34",
                    "type": "text",
                    "label": "N",
                    "styles": {
                      "fontWeight": 600,
                      "textAlign": "center"
                    },
                    "properties": {
                      "value": "Rust"
                    }
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        "id": "page_contact",
        "name": "Contact",
        "elements": [
          {
            "id": "b_35",
            "type": "heading",
            "label": "Title",
            "styles": {
              "fontSize": 22,
              "fontWeight": 800
            },
            "properties": {
              "value": "Get in Touch"
            }
          },
          {
            "id": "b_36",
            "type": "card",
            "label": "Form",
            "styles": {
              "borderRadius": 16
            },
            "properties": {},
            "children": [
              {
                "id": "b_37",
                "type": "input",
                "label": "Name",
                "styles": {},
                "properties": {
                  "placeholder": "Your Name"
                }
              },
              {
                "id": "b_38",
                "type": "input",
                "label": "Email",
                "styles": {},
                "properties": {
                  "placeholder": "Email"
                }
              },
              {
                "id": "b_39",
                "type": "textarea",
                "label": "Message",
                "styles": {},
                "properties": {
                  "placeholder": "Message"
                }
              },
              {
                "id": "b_40",
                "type": "button",
                "label": "Send",
                "styles": {
                  "backgroundColor": "#f97316",
                  "color": "#ffffff",
                  "borderRadius": 10
                },
                "properties": {
                  "value": "Send Message"
                }
              }
            ]
          }
        ]
      }
    ]
  },
  "saas": {
    "name": "SaaS / App",
    "icon": "⚡",
    "color": "#14b8a6",
    "description": "SaaS landing page with features, pricing, dashboard, and changelog",
    "pages": [
      {
        "id": "page_home",
        "name": "Home",
        "elements": [
          {
            "id": "b_1",
            "type": "container",
            "label": "Hero",
            "styles": {
              "backgroundColor": "#0f172a",
              "borderRadius": 20,
              "padding": 32,
              "alignItems": "center"
            },
            "properties": {},
            "children": [
              {
                "id": "b_2",
                "type": "heading",
                "label": "Tagline",
                "styles": {
                  "color": "#ffffff",
                  "fontSize": 28,
                  "fontWeight": 800,
                  "textAlign": "center"
                },
                "properties": {
                  "value": "Ship Products\nFaster"
                }
              },
              {
                "id": "b_3",
                "type": "text",
                "label": "Sub",
                "styles": {
                  "color": "#94a3b8",
                  "textAlign": "center"
                },
                "properties": {
                  "value": "The all-in-one platform for building and launching mobile apps."
                }
              },
              {
                "id": "b_4",
                "type": "button",
                "label": "CTA",
                "styles": {
                  "backgroundColor": "#14b8a6",
                  "color": "#ffffff",
                  "borderRadius": 10,
                  "alignSelf": "center"
                },
                "properties": {
                  "value": "Start Free Trial"
                }
              }
            ]
          },
          {
            "id": "b_5",
            "type": "heading",
            "label": "Features",
            "styles": {
              "fontSize": 20,
              "fontWeight": 700
            },
            "properties": {
              "value": "Key Features"
            }
          },
          {
            "id": "b_6",
            "type": "grid",
            "label": "Grid",
            "styles": {},
            "properties": {
              "gridCols": 2
            },
            "children": [
              {
                "id": "b_7",
                "type": "card",
                "label": "F1",
                "styles": {
                  "borderRadius": 12
                },
                "properties": {},
                "children": [
                  {
                    "id": "b_8",
                    "type": "heading",
                    "label": "Name",
                    "styles": {
                      "fontSize": 13,
                      "fontWeight": 700
                    },
                    "properties": {
                      "value": "⚡ Visual Builder"
                    }
                  },
                  {
                    "id": "b_9",
                    "type": "text",
                    "label": "Desc",
                    "styles": {
                      "color": "#64748b",
                      "fontSize": 11
                    },
                    "properties": {
                      "value": "Drag-drop interface"
                    }
                  }
                ]
              },
              {
                "id": "b_10",
                "type": "card",
                "label": "F2",
                "styles": {
                  "borderRadius": 12
                },
                "properties": {},
                "children": [
                  {
                    "id": "b_11",
                    "type": "heading",
                    "label": "Name",
                    "styles": {
                      "fontSize": 13,
                      "fontWeight": 700
                    },
                    "properties": {
                      "value": "📱 EAS Builds"
                    }
                  },
                  {
                    "id": "b_12",
                    "type": "text",
                    "label": "Desc",
                    "styles": {
                      "color": "#64748b",
                      "fontSize": 11
                    },
                    "properties": {
                      "value": "Cloud compilation"
                    }
                  }
                ]
              },
              {
                "id": "b_13",
                "type": "card",
                "label": "F3",
                "styles": {
                  "borderRadius": 12
                },
                "properties": {},
                "children": [
                  {
                    "id": "b_14",
                    "type": "heading",
                    "label": "Name",
                    "styles": {
                      "fontSize": 13,
                      "fontWeight": 700
                    },
                    "properties": {
                      "value": "🔄 OTA Updates"
                    }
                  },
                  {
                    "id": "b_15",
                    "type": "text",
                    "label": "Desc",
                    "styles": {
                      "color": "#64748b",
                      "fontSize": 11
                    },
                    "properties": {
                      "value": "Instant updates"
                    }
                  }
                ]
              },
              {
                "id": "b_16",
                "type": "card",
                "label": "F4",
                "styles": {
                  "borderRadius": 12
                },
                "properties": {},
                "children": [
                  {
                    "id": "b_17",
                    "type": "heading",
                    "label": "Name",
                    "styles": {
                      "fontSize": 13,
                      "fontWeight": 700
                    },
                    "properties": {
                      "value": "🔌 SDK Marketplace"
                    }
                  },
                  {
                    "id": "b_18",
                    "type": "text",
                    "label": "Desc",
                    "styles": {
                      "color": "#64748b",
                      "fontSize": 11
                    },
                    "properties": {
                      "value": "One-click plugins"
                    }
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        "id": "page_pricing",
        "name": "Pricing",
        "elements": [
          {
            "id": "b_19",
            "type": "heading",
            "label": "Title",
            "styles": {
              "fontSize": 24,
              "fontWeight": 800
            },
            "properties": {
              "value": "Simple Pricing"
            }
          },
          {
            "id": "b_20",
            "type": "card",
            "label": "Starter",
            "styles": {
              "borderRadius": 16,
              "backgroundColor": "#ffffff"
            },
            "properties": {},
            "children": [
              {
                "id": "b_21",
                "type": "heading",
                "label": "Name",
                "styles": {
                  "fontSize": 18,
                  "fontWeight": 700
                },
                "properties": {
                  "value": "Starter"
                }
              },
              {
                "id": "b_22",
                "type": "heading",
                "label": "Price",
                "styles": {
                  "fontSize": 32,
                  "fontWeight": 800,
                  "color": "#14b8a6"
                },
                "properties": {
                  "value": "$19"
                }
              },
              {
                "id": "b_23",
                "type": "text",
                "label": "Period",
                "styles": {
                  "color": "#64748b"
                },
                "properties": {
                  "value": "/month"
                }
              },
              {
                "id": "b_24",
                "type": "text",
                "label": "Features",
                "styles": {
                  "color": "#334155"
                },
                "properties": {
                  "value": "1 app · 1,000 users\nBasic support"
                }
              },
              {
                "id": "b_25",
                "type": "button",
                "label": "CTA",
                "styles": {
                  "backgroundColor": "#f1f5f9",
                  "color": "#0f172a",
                  "borderRadius": 10
                },
                "properties": {
                  "value": "Get Started"
                }
              }
            ]
          },
          {
            "id": "b_26",
            "type": "card",
            "label": "Pro",
            "styles": {
              "borderRadius": 16,
              "backgroundColor": "#0f172a"
            },
            "properties": {},
            "children": [
              {
                "id": "b_27",
                "type": "heading",
                "label": "Name",
                "styles": {
                  "fontSize": 18,
                  "fontWeight": 700,
                  "color": "#ffffff"
                },
                "properties": {
                  "value": "Professional"
                }
              },
              {
                "id": "b_28",
                "type": "heading",
                "label": "Price",
                "styles": {
                  "fontSize": 32,
                  "fontWeight": 800,
                  "color": "#14b8a6"
                },
                "properties": {
                  "value": "$49"
                }
              },
              {
                "id": "b_29",
                "type": "text",
                "label": "Period",
                "styles": {
                  "color": "#94a3b8"
                },
                "properties": {
                  "value": "/month"
                }
              },
              {
                "id": "b_30",
                "type": "text",
                "label": "Features",
                "styles": {
                  "color": "#cbd5e1"
                },
                "properties": {
                  "value": "5 apps · Unlimited users\nPriority support · SDKs"
                }
              },
              {
                "id": "b_31",
                "type": "button",
                "label": "CTA",
                "styles": {
                  "backgroundColor": "#14b8a6",
                  "color": "#ffffff",
                  "borderRadius": 10
                },
                "properties": {
                  "value": "Start Free Trial"
                }
              }
            ]
          }
        ]
      },
      {
        "id": "page_features",
        "name": "Features",
        "elements": [
          {
            "id": "b_32",
            "type": "heading",
            "label": "Title",
            "styles": {
              "fontSize": 24,
              "fontWeight": 800
            },
            "properties": {
              "value": "Everything You Need"
            }
          },
          {
            "id": "b_33",
            "type": "card",
            "label": "F1",
            "styles": {
              "borderRadius": 12
            },
            "properties": {},
            "children": [
              {
                "id": "b_34",
                "type": "heading",
                "label": "Name",
                "styles": {
                  "fontSize": 16,
                  "fontWeight": 700
                },
                "properties": {
                  "value": "Visual Page Builder"
                }
              },
              {
                "id": "b_35",
                "type": "text",
                "label": "Desc",
                "styles": {
                  "color": "#64748b"
                },
                "properties": {
                  "value": "Build beautiful app screens with drag-and-drop. No coding required."
                }
              }
            ]
          },
          {
            "id": "b_36",
            "type": "card",
            "label": "F2",
            "styles": {
              "borderRadius": 12
            },
            "properties": {},
            "children": [
              {
                "id": "b_37",
                "type": "heading",
                "label": "Name",
                "styles": {
                  "fontSize": 16,
                  "fontWeight": 700
                },
                "properties": {
                  "value": "Native EAS Builds"
                }
              },
              {
                "id": "b_38",
                "type": "text",
                "label": "Desc",
                "styles": {
                  "color": "#64748b"
                },
                "properties": {
                  "value": "Compile APK/IPA in the cloud. No local setup needed."
                }
              }
            ]
          },
          {
            "id": "b_39",
            "type": "card",
            "label": "F3",
            "styles": {
              "borderRadius": 12
            },
            "properties": {},
            "children": [
              {
                "id": "b_40",
                "type": "heading",
                "label": "Name",
                "styles": {
                  "fontSize": 16,
                  "fontWeight": 700
                },
                "properties": {
                  "value": "Over-the-Air Updates"
                }
              },
              {
                "id": "b_41",
                "type": "text",
                "label": "Desc",
                "styles": {
                  "color": "#64748b"
                },
                "properties": {
                  "value": "Push updates instantly without App Store review."
                }
              }
            ]
          }
        ]
      },
      {
        "id": "page_dashboard",
        "name": "Dashboard",
        "elements": [
          {
            "id": "b_42",
            "type": "heading",
            "label": "Title",
            "styles": {
              "fontSize": 22,
              "fontWeight": 800
            },
            "properties": {
              "value": "Dashboard"
            }
          },
          {
            "id": "b_43",
            "type": "grid",
            "label": "Stats",
            "styles": {},
            "properties": {
              "gridCols": 2
            },
            "children": [
              {
                "id": "b_44",
                "type": "card",
                "label": "S1",
                "styles": {
                  "borderRadius": 12,
                  "alignItems": "center"
                },
                "properties": {},
                "children": [
                  {
                    "id": "b_45",
                    "type": "heading",
                    "label": "Num",
                    "styles": {
                      "fontSize": 24,
                      "fontWeight": 800,
                      "color": "#14b8a6",
                      "textAlign": "center"
                    },
                    "properties": {
                      "value": "2.4k"
                    }
                  },
                  {
                    "id": "b_46",
                    "type": "text",
                    "label": "L",
                    "styles": {
                      "color": "#64748b",
                      "textAlign": "center"
                    },
                    "properties": {
                      "value": "Users"
                    }
                  }
                ]
              },
              {
                "id": "b_47",
                "type": "card",
                "label": "S2",
                "styles": {
                  "borderRadius": 12,
                  "alignItems": "center"
                },
                "properties": {},
                "children": [
                  {
                    "id": "b_48",
                    "type": "heading",
                    "label": "Num",
                    "styles": {
                      "fontSize": 24,
                      "fontWeight": 800,
                      "color": "#14b8a6",
                      "textAlign": "center"
                    },
                    "properties": {
                      "value": "12"
                    }
                  },
                  {
                    "id": "b_49",
                    "type": "text",
                    "label": "L",
                    "styles": {
                      "color": "#64748b",
                      "textAlign": "center"
                    },
                    "properties": {
                      "value": "Apps"
                    }
                  }
                ]
              },
              {
                "id": "b_50",
                "type": "card",
                "label": "S3",
                "styles": {
                  "borderRadius": 12,
                  "alignItems": "center"
                },
                "properties": {},
                "children": [
                  {
                    "id": "b_51",
                    "type": "heading",
                    "label": "Num",
                    "styles": {
                      "fontSize": 24,
                      "fontWeight": 800,
                      "color": "#14b8a6",
                      "textAlign": "center"
                    },
                    "properties": {
                      "value": "98%"
                    }
                  },
                  {
                    "id": "b_52",
                    "type": "text",
                    "label": "L",
                    "styles": {
                      "color": "#64748b",
                      "textAlign": "center"
                    },
                    "properties": {
                      "value": "Uptime"
                    }
                  }
                ]
              },
              {
                "id": "b_53",
                "type": "card",
                "label": "S4",
                "styles": {
                  "borderRadius": 12,
                  "alignItems": "center"
                },
                "properties": {},
                "children": [
                  {
                    "id": "b_54",
                    "type": "heading",
                    "label": "Num",
                    "styles": {
                      "fontSize": 24,
                      "fontWeight": 800,
                      "color": "#14b8a6",
                      "textAlign": "center"
                    },
                    "properties": {
                      "value": "4.9"
                    }
                  },
                  {
                    "id": "b_55",
                    "type": "text",
                    "label": "L",
                    "styles": {
                      "color": "#64748b",
                      "textAlign": "center"
                    },
                    "properties": {
                      "value": "Rating"
                    }
                  }
                ]
              }
            ]
          },
          {
            "id": "b_56",
            "type": "heading",
            "label": "Recent",
            "styles": {
              "fontSize": 16,
              "fontWeight": 700
            },
            "properties": {
              "value": "Recent Activity"
            }
          },
          {
            "id": "b_57",
            "type": "card",
            "label": "Activity",
            "styles": {
              "borderRadius": 12
            },
            "properties": {},
            "children": [
              {
                "id": "b_58",
                "type": "text",
                "label": "A1",
                "styles": {
                  "fontWeight": 600
                },
                "properties": {
                  "value": "App \"Storefront\" built successfully"
                }
              }
            ]
          }
        ]
      },
      {
        "id": "page_docs",
        "name": "Documentation",
        "elements": [
          {
            "id": "b_59",
            "type": "heading",
            "label": "Title",
            "styles": {
              "fontSize": 22,
              "fontWeight": 800
            },
            "properties": {
              "value": "Quick Start"
            }
          },
          {
            "id": "b_60",
            "type": "card",
            "label": "Step 1",
            "styles": {
              "borderRadius": 12
            },
            "properties": {},
            "children": [
              {
                "id": "b_61",
                "type": "heading",
                "label": "Step",
                "styles": {
                  "fontSize": 14,
                  "fontWeight": 700,
                  "color": "#14b8a6"
                },
                "properties": {
                  "value": "1. Create your app"
                }
              },
              {
                "id": "b_62",
                "type": "text",
                "label": "Desc",
                "styles": {
                  "color": "#64748b"
                },
                "properties": {
                  "value": "Click \"New App\" and choose a name and template."
                }
              }
            ]
          },
          {
            "id": "b_63",
            "type": "card",
            "label": "Step 2",
            "styles": {
              "borderRadius": 12
            },
            "properties": {},
            "children": [
              {
                "id": "b_64",
                "type": "heading",
                "label": "Step",
                "styles": {
                  "fontSize": 14,
                  "fontWeight": 700,
                  "color": "#14b8a6"
                },
                "properties": {
                  "value": "2. Design your pages"
                }
              },
              {
                "id": "b_65",
                "type": "text",
                "label": "Desc",
                "styles": {
                  "color": "#64748b"
                },
                "properties": {
                  "value": "Use the visual builder to add blocks and customize."
                }
              }
            ]
          },
          {
            "id": "b_66",
            "type": "card",
            "label": "Step 3",
            "styles": {
              "borderRadius": 12
            },
            "properties": {},
            "children": [
              {
                "id": "b_67",
                "type": "heading",
                "label": "Step",
                "styles": {
                  "fontSize": 14,
                  "fontWeight": 700,
                  "color": "#14b8a6"
                },
                "properties": {
                  "value": "3. Build & publish"
                }
              },
              {
                "id": "b_68",
                "type": "text",
                "label": "Desc",
                "styles": {
                  "color": "#64748b"
                },
                "properties": {
                  "value": "Generate a native app and publish OTA updates."
                }
              }
            ]
          }
        ]
      },
      {
        "id": "page_changelog",
        "name": "Changelog",
        "elements": [
          {
            "id": "b_69",
            "type": "heading",
            "label": "Title",
            "styles": {
              "fontSize": 22,
              "fontWeight": 800
            },
            "properties": {
              "value": "Changelog"
            }
          },
          {
            "id": "b_70",
            "type": "card",
            "label": "v2.0",
            "styles": {
              "borderRadius": 12
            },
            "properties": {},
            "children": [
              {
                "id": "b_71",
                "type": "text",
                "label": "Version",
                "styles": {
                  "fontWeight": 700,
                  "color": "#14b8a6"
                },
                "properties": {
                  "value": "v2.0 — Major Update"
                }
              },
              {
                "id": "b_72",
                "type": "text",
                "label": "Notes",
                "styles": {
                  "color": "#64748b"
                },
                "properties": {
                  "value": "• New visual builder\n• SDK marketplace\n• Performance improvements"
                }
              }
            ]
          },
          {
            "id": "b_73",
            "type": "card",
            "label": "v1.5",
            "styles": {
              "borderRadius": 12
            },
            "properties": {},
            "children": [
              {
                "id": "b_74",
                "type": "text",
                "label": "Version",
                "styles": {
                  "fontWeight": 700,
                  "color": "#14b8a6"
                },
                "properties": {
                  "value": "v1.5"
                }
              },
              {
                "id": "b_75",
                "type": "text",
                "label": "Notes",
                "styles": {
                  "color": "#64748b"
                },
                "properties": {
                  "value": "• OTA updates\n• Push notifications\n• Bug fixes"
                }
              }
            ]
          },
          {
            "id": "b_76",
            "type": "card",
            "label": "v1.0",
            "styles": {
              "borderRadius": 12
            },
            "properties": {},
            "children": [
              {
                "id": "b_77",
                "type": "text",
                "label": "Version",
                "styles": {
                  "fontWeight": 700,
                  "color": "#14b8a6"
                },
                "properties": {
                  "value": "v1.0 — Launch"
                }
              },
              {
                "id": "b_78",
                "type": "text",
                "label": "Notes",
                "styles": {
                  "color": "#64748b"
                },
                "properties": {
                  "value": "• Initial release\n• Page builder\n• EAS builds"
                }
              }
            ]
          }
        ]
      }
    ]
  }
};
