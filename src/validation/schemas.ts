/**
 * Zod validation schemas for all MCP tool inputs.
 *
 * These schemas validate the parameters that the AI agent sends
 * BEFORE forwarding requests to the Igniral backend.
 * This prevents hallucinated or malformed data from reaching the API.
 */

import { z } from "zod";

/**
 * Tool 1: igniral_generate_schema_from_prompt
 * Validates the natural language prompt for auto-generation.
 */
export const generateSchemaInput = z.object({
  prompt: z
    .string()
    .min(10, "Prompt must be at least 10 characters to generate a meaningful application")
    .max(2000, "Prompt must be under 2000 characters"),
});

/**
 * Tool 2: igniral_create_application
 * Validates application creation parameters.
 * Maps to ApplicationRequest DTO in json-elements.
 */
export const createApplicationInput = z.object({
  name: z
    .string()
    .min(1, "Application name is required")
    .max(100, "Application name must be under 100 characters"),
  description: z
    .string()
    .min(1, "Application description is required")
    .max(500, "Application description must be under 500 characters"),
  version: z.string().optional().default("v1"),
  subdomain: z
    .string()
    .regex(/^[a-z0-9-]+$/, "Subdomain must contain only lowercase letters, numbers, and hyphens")
    .optional(),
  aiGeneratedContext: z.string().optional(),
  isPrivate: z.boolean().optional().default(true),
});

/**
 * Security config for CLAIM_FILTER policy.
 */
const securityConfigSchema = z.object({
  claimFilterRules: z
    .array(
      z.object({
        payloadPath: z.string().min(1, "payloadPath is required"),
        claimName: z.string().min(1, "claimName is required"),
      })
    )
    .min(1, "At least one claim filter rule is required"),
});

/**
 * Tool 3: igniral_create_dynamic_endpoint
 * Validates endpoint creation parameters.
 * Maps to DynamicEndpointRequest DTO in json-elements.
 */
export const createEndpointInput = z
  .object({
    applicationId: z.string().min(1, "applicationId is required"),
    endpointPath: z
      .string()
      .min(1, "endpointPath is required")
      .regex(
        /^\/[a-z0-9-/]+$/,
        "endpointPath must start with / and contain only lowercase letters, numbers, hyphens, and slashes"
      ),
    allowedMethods: z
      .array(z.enum(["GET", "POST", "PUT", "DELETE"]))
      .min(1, "At least one HTTP method is required"),
    schemaDefinition: z.record(z.unknown()).refine(
      (schema) => schema["type"] !== undefined || schema["$schema"] !== undefined,
      "schemaDefinition must be a valid JSON Schema with at least a 'type' or '$schema' property"
    ),
    type: z.enum(["JSON", "FILE"]).optional().default("JSON"),
    visibility: z.enum(["PUBLIC", "PRIVATE"]).optional().default("PRIVATE"),
    securityPolicy: z
      .enum(["NONE", "OWNER_ONLY", "CLAIM_FILTER"])
      .optional()
      .default("NONE"),
    securityConfig: securityConfigSchema.optional(),
    endpointDocumentation: z.string().optional(),
  })
  .refine(
    (data) =>
      data.securityPolicy !== "CLAIM_FILTER" || data.securityConfig != null,
    {
      message:
        "securityConfig with claimFilterRules is required when securityPolicy is CLAIM_FILTER",
      path: ["securityConfig"],
    }
  );

// Type exports for use in tool handlers
export type GenerateSchemaInput = z.infer<typeof generateSchemaInput>;
export type CreateApplicationInput = z.infer<typeof createApplicationInput>;
export type CreateEndpointInput = z.infer<typeof createEndpointInput>;
