import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: ["class"],
    content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
  	extend: {
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)',
  			xl: 'calc(var(--radius) + 4px)',
  			'2xl': 'calc(var(--radius) + 8px)'
  		},
  		fontFamily: {
  			sans: ['var(--font-geist-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
  			mono: ['var(--font-geist-mono)', 'ui-monospace', 'monospace']
  		},
  		boxShadow: {
  			xs: 'var(--shadow-xs)',
  			e1: 'var(--shadow-sm)',
  			e2: 'var(--shadow-md)',
  			e3: 'var(--shadow-lg)',
  			e4: 'var(--shadow-xl)',
  			accent: 'var(--shadow-accent)'
  		},
  		transitionTimingFunction: {
  			'out-quint': 'var(--ease-out-quint)',
  			standard: 'var(--ease-standard)',
  			spring: 'var(--ease-spring)',
  			'in-out-soft': 'var(--ease-in-out)'
  		},
  		transitionDuration: {
  			fast: 'var(--duration-fast)',
  			base: 'var(--duration-base)',
  			slow: 'var(--duration-slow)',
  			slower: 'var(--duration-slower)'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
