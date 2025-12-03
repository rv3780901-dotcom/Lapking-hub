'use server';

/**
 * @fileOverview A product compatibility suggestion AI agent.
 *
 * - suggestCompatibleProducts - A function that suggests compatible products based on cart items or requirements.
 * - SuggestCompatibleProductsInput - The input type for the suggestCompatibleProducts function.
 * - SuggestCompatibleProductsOutput - The return type for the suggestCompatibleProducts function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestCompatibleProductsInputSchema = z.object({
  cartItems: z.array(
    z.object({
      name: z.string().describe('The name of the product.'),
      description: z.string().describe('The description of the product.'),
    })
  ).optional().describe('The items currently in the user\'s cart.'),
  requirements: z.string().optional().describe('The user\'s stated requirements for compatible products.'),
});
export type SuggestCompatibleProductsInput = z.infer<typeof SuggestCompatibleProductsInputSchema>;

const SuggestCompatibleProductsOutputSchema = z.object({
  suggestions: z.array(z.string()).describe('A list of suggested compatible product names.'),
});
export type SuggestCompatibleProductsOutput = z.infer<typeof SuggestCompatibleProductsOutputSchema>;

export async function suggestCompatibleProducts(input: SuggestCompatibleProductsInput): Promise<SuggestCompatibleProductsOutput> {
  return suggestCompatibleProductsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestCompatibleProductsPrompt',
  input: {schema: SuggestCompatibleProductsInputSchema},
  output: {schema: SuggestCompatibleProductsOutputSchema},
  prompt: `You are an AI assistant specializing in suggesting compatible products for an e-commerce platform.

  Based on the items in the user's cart and/or their stated requirements, you will provide a list of product suggestions.

  If the user has items in their cart, use the product names and descriptions to determine what other products might be compatible.
  If the user has stated specific requirements, prioritize those requirements when making suggestions.

  Cart Items:
  {{#if cartItems}}
    {{#each cartItems}}
      - {{this.name}}: {{this.description}}
    {{/each}}
  {{else}}
    No items in cart.
  {{/if}}

  Requirements: {{requirements}}

  Suggestions:`, // No Handlebars logic here, just the LLM generating a plain list.
});

const suggestCompatibleProductsFlow = ai.defineFlow(
  {
    name: 'suggestCompatibleProductsFlow',
    inputSchema: SuggestCompatibleProductsInputSchema,
    outputSchema: SuggestCompatibleProductsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
