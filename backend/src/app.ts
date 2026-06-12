import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import cors from '@fastify/cors';
import responseValidation from '@fastify/response-validation';
import fastifyStatic from '@fastify/static';
import openapiGlue from '@platformatic/fastify-openapi-glue';
import ajvFormats from 'ajv-formats';
import fastify, { type FastifyInstance, type FastifyReply } from 'fastify';

import { createRouteHandlers, toOpenApiServiceHandlers } from './api/handlers.js';
import { errors } from './api/errors.js';
import type { BookingRepository } from './domain.js';
import { createBookingService } from './services/bookingService.js';

export type BuildAppOptions = {
  enableResponseValidation?: boolean;
  frontendDistPath?: string | false;
  now?: () => Date;
  openApiPath?: string;
  repository: BookingRepository;
};

const defaultOpenApiPath = fileURLToPath(new URL('../../contracts/generated/openapi.yaml', import.meta.url));
const defaultFrontendDistPath = fileURLToPath(new URL('../../frontend/dist', import.meta.url));

export async function buildApp(options: BuildAppOptions) {
  const app = fastify({
    ajv: {
      plugins: [ajvFormats],
    },
    logger: false,
  });
  const service = createBookingService({
    now: options.now ?? (() => new Date()),
    repository: options.repository,
  });

  await app.register(cors, {
    origin: true,
  });

  if (options.enableResponseValidation) {
    await app.register(responseValidation, {
      ajv: {
        plugins: [ajvFormats],
      },
    });
  }

  app.setErrorHandler((error, _request, reply) => {
    if (isRequestValidationError(error)) {
      return reply.code(400).send(errors.validation(getErrorMessage(error)));
    }

    if (getErrorCode(error) === 'FST_RESPONSE_VALIDATION_FAILED_VALIDATION') {
      return reply
        .code(500)
        .send({ code: 'RESPONSE_VALIDATION_ERROR', message: 'Response does not match contract.' });
    }

    app.log.error(error);

    return reply.code(500).send({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error.',
    });
  });

  await app.register(openapiGlue, {
    serviceHandlers: toOpenApiServiceHandlers(createRouteHandlers(service)),
    specification: options.openApiPath ?? defaultOpenApiPath,
  });

  if (options.frontendDistPath !== false) {
    await registerFrontend(app, options.frontendDistPath ?? defaultFrontendDistPath);
  }

  return app;
}

async function registerFrontend(app: FastifyInstance, frontendDistPath: string) {
  const indexPath = join(frontendDistPath, 'index.html');
  const assetsPath = join(frontendDistPath, 'assets');

  if (!existsSync(indexPath)) {
    return;
  }

  if (existsSync(assetsPath)) {
    await app.register(fastifyStatic, {
      decorateReply: false,
      prefix: '/assets/',
      root: assetsPath,
    });
  }

  const indexHtml = await readFile(indexPath, 'utf8');
  const sendIndexHtml = (reply: FastifyReply) => reply.type('text/html; charset=utf-8').send(indexHtml);

  app.get('/', async (_request, reply) => sendIndexHtml(reply));
  app.setNotFoundHandler((request, reply) => {
    if (request.method === 'GET' && acceptsHtml(request.headers.accept)) {
      return sendIndexHtml(reply);
    }

    return reply.code(404).send({
      code: 'NOT_FOUND',
      message: 'Route not found.',
    });
  });
}

function acceptsHtml(acceptHeader: string | string[] | undefined): boolean {
  const accept = Array.isArray(acceptHeader) ? acceptHeader.join(',') : acceptHeader;

  return accept?.includes('text/html') ?? false;
}

function isRequestValidationError(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && (error as { validation?: unknown }).validation);
}

function getErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') {
    return undefined;
  }

  const { code } = error as { code?: unknown };

  return typeof code === 'string' ? code : undefined;
}

function getErrorMessage(error: unknown): string {
  if (!error || typeof error !== 'object') {
    return 'Request validation failed.';
  }

  const { message } = error as { message?: unknown };

  return typeof message === 'string' && message ? message : 'Request validation failed.';
}
