import type { Source } from './types.ts';

/** Primary references from PRD §16. They support teaching foundations, not the fictional scenario values. */
export const SOURCES: Source[] = [
  {
    id: 'eia-delivery',
    title: 'Delivery to consumers',
    publisher: 'U.S. Energy Information Administration',
    url: 'https://www.eia.gov/energyexplained/electricity/delivery-to-consumers.php',
    supports: 'Generation-to-consumer infrastructure, step-up and step-down transformer roles, and supply/demand balance. Does not support any scenario value.',
    accessed: '2026-10-12',
  },
  {
    id: 'eia-storage',
    title: 'Energy storage for electricity generation',
    publisher: 'U.S. Energy Information Administration',
    url: 'https://www.eia.gov/energyexplained/electricity/energy-storage-for-electricity-generation.php',
    supports: 'Storage roles and charging/discharging context. Does not support the idealized lossless battery used in the model.',
    accessed: '2026-10-12',
  },
  {
    id: 'eia-generation',
    title: 'Electricity generation, capacity, and sales in the United States',
    publisher: 'U.S. Energy Information Administration',
    url: 'https://www.eia.gov/energyexplained/electricity/electricity-in-the-us-generation-capacity-and-sales.php',
    supports: 'Distinction between generation and capacity; storage consumes energy to charge.',
    accessed: '2026-10-12',
  },
];
