import type { ICredentialTestRequest, ICredentialType, INodeProperties } from 'n8n-workflow';

export class ShalomApiApi implements ICredentialType {
	name = 'shalomApiApi';

	displayName = 'Shalom API';

	documentationUrl = 'https://shalom-api.lat/';

	properties: INodeProperties[] = [
		{
			displayName:
				'Obtén tu API key en el panel: [shalom-api.lat/dashboard/apikey](https://shalom-api.lat/dashboard/apikey). Revisa la [documentación](https://shalom-api.lat/).',
			name: 'noticeApiKey',
			type: 'notice',
			default: '',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://api.shalom-api.lat',
			placeholder: 'https://api.shalom-api.lat',
			description: 'URL base de la API de Shalom.',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description:
				'Tu API key de Shalom. Se envía como cabecera x-api-key. Obtén la tuya en [Panel → API Keys](https://shalom-api.lat/dashboard/apikey).',
		},
	];

	authenticate = {
		type: 'generic' as const,
		properties: {
			headers: {
				'x-api-key': '={{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{ $credentials.baseUrl }}',
			url: '/validate',
			method: 'GET',
			headers: {
				'x-api-key': '={{ $credentials.apiKey }}',
			},
		},
		rules: [
			{
				type: 'responseCode',
				properties: {
					value: 200,
					message: 'Conexión exitosa: API key válida',
				},
			},
			{
				type: 'responseCode',
				properties: {
					value: 401,
					message: 'API key inválida o falta la cabecera x-api-key',
				},
			},
			{
				type: 'responseCode',
				properties: {
					value: 403,
					message: 'API key sin permisos o plan expirado',
				},
			},
			{
				type: 'responseCode',
				properties: {
					value: 429,
					message: 'Límite mensual de uso excedido',
				},
			},
			{
				type: 'responseCode',
				properties: {
					value: 404,
					message: 'El endpoint /validate no está disponible en esta base URL',
				},
			},
		],
	};
}