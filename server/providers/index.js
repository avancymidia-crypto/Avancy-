/**
 * Escolhe o provider de dados a partir da configuração.
 *
 * Os dois implementam o mesmo contrato:
 *   getAccount(session)              -> { igUserId, username, name, followersCount, ... }
 *   getAggregates(session, period)   -> { current, previous }
 *   getSeries(session, period)       -> [{ label, reach, interactions }]
 *   getPosts(session, period)        -> [{ id, title, format, timestamp, reach, ... }]
 *   getNotifications(session)        -> [{ dot, title, body, time }]
 */

import { config } from '../config.js';
import { mockProvider } from './mock.js';
import { instagramProvider } from './instagram.js';

export const provider = config.dataProvider === 'instagram' ? instagramProvider : mockProvider;

export const usingMockData = provider.id === 'mock';
