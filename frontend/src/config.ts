import { http, createConfig } from 'wagmi';
import { defineChain } from 'viem';

/**
 * Kite AI Testnet chain configuration
 */
export const kiteTestnet = defineChain({
  id: 2368,
  name: 'Kite AI Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'KITE',
    symbol: 'KITE',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc-testnet.gokite.ai'],
    },
  },
  blockExplorers: {
    default: {
      name: 'KiteScan',
      url: 'https://testnet.kitescan.ai',
    },
  },
  testnet: true,
});

/**
 * Wagmi configuration
 */
export const wagmiConfig = createConfig({
  chains: [kiteTestnet],
  transports: {
    [kiteTestnet.id]: http(),
  },
});

/**
 * API configuration
 */
export const apiConfig = {
  baseUrl: '/api', // Proxied to http://localhost:3001
};

/**
 * Coffee menu items with prices
 */
export const coffeeMenu = [
  { item: 'Latte', price: 0.03, description: 'Espresso with steamed milk' },
  { item: 'Espresso', price: 0.02, description: 'Strong concentrated coffee' },
  { item: 'Cappuccino', price: 0.04, description: 'Espresso with foamed milk' },
  { item: 'Americano', price: 0.025, description: 'Espresso with hot water' },
  { item: 'Premium Gold Coffee', price: 1.5, description: 'Special blend (will exceed limit!)' },
];
