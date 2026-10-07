import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestOptions,
	INodeExecutionData,
	INodeProperties,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import type { RegisterShipmentBody, ShalomCredentials } from '../../types';

interface OperationDefinition {
	value: string;
	displayName: string;
	description: string;
}

interface ResourceDefinition {
	name: string;
	displayName: string;
	description: string;
	operations: OperationDefinition[];
}

const RESOURCES: ResourceDefinition[] = [
	{
		name: 'agencia',
		displayName: 'Agencias',
		description: 'Consulta las agencias autorizadas de Shalom.',
		operations: [
			{
				value: 'list',
				displayName: 'Listar agencias',
				description: 'Lista las agencias autorizadas, opcionalmente filtradas.',
			},
			{
				value: 'search',
				displayName: 'Búsqueda avanzada',
				description: 'Busca agencias por texto, filtros y cercanía a coordenadas.',
			},
		],
	},
	{
		name: 'ubicacion',
		displayName: 'Ubicaciones',
		description: 'Consulta departamentos, provincias y distritos del Perú.',
		operations: [
			{
				value: 'departments',
				displayName: 'Listar departamentos',
				description: 'Lista todos los departamentos del Perú.',
			},
			{
				value: 'provinces',
				displayName: 'Listar provincias',
				description: 'Lista las provincias de un departamento.',
			},
			{
				value: 'districts',
				displayName: 'Listar distritos',
				description: 'Lista los distritos de una provincia.',
			},
		],
	},
	{
		name: 'tracking',
		displayName: 'Tracking',
		description: 'Rastrea envíos y descarga comprobantes y etiquetas.',
		operations: [
			{
				value: 'track',
				displayName: 'Rastrear envío',
				description: 'Seguimiento de un envío por número de guía y código.',
			},
			{
				value: 'trackBatch',
				displayName: 'Rastrear en lote',
				description: 'Rastrea varias órdenes en una sola petición (máx. 50).',
			},
			{
				value: 'voucher',
				displayName: 'Descargar ticket oficial',
				description:
					'Descarga el ticket oficial del envío en PDF o como imagen (JPEG/PNG) para WhatsApp.',
			},
			{
				value: 'label',
				displayName: 'Descargar etiqueta PDF',
				description: 'Descarga la etiqueta del envío en PDF.',
			},
		],
	},
	{
		name: 'cuenta',
		displayName: 'Cuentas',
		description: 'Cotiza, consulta DNI y gestiona envíos de Shalom Pro.',
		operations: [
			{
				value: 'quote',
				displayName: 'Cotizar envío',
				description: 'Calcula el costo de un envío entre dos terminales.',
			},
			{
				value: 'dni',
				displayName: 'Consultar DNI',
				description: 'Obtiene información de una persona por su DNI.',
			},
			{
				value: 'register',
				displayName: 'Registrar envío individual',
				description: 'Registra un envío individual en Shalom Pro.',
			},
			{
				value: 'registerBulk',
				displayName: 'Registrar envíos (masivo)',
				description: 'Registra uno o varios envíos desde la instancia.',
			},
			{
				value: 'pendingShipments',
				displayName: 'Envíos pendientes',
				description: 'Lista los envíos pendientes de la cuenta.',
			},
			{
				value: 'getUser',
				displayName: 'Información del usuario',
				description: 'Datos del usuario autenticado en Shalom Pro.',
			},
		],
	},
	{
		name: 'instancia',
		displayName: 'Instancias',
		description: 'Gestiona instancias y la sesión en Shalom Pro.',
		operations: [
			{
				value: 'create',
				displayName: 'Crear instancia',
				description: 'Crea una nueva instancia para conectar una cuenta.',
			},
			{
				value: 'list',
				displayName: 'Listar instancias',
				description: 'Lista las instancias de la cuenta y su estado.',
			},
			{
				value: 'delete',
				displayName: 'Eliminar instancia',
				description: 'Elimina una instancia y cierra su sesión.',
			},
			{
				value: 'login',
				displayName: 'Iniciar sesión (Shalom Pro)',
				description: 'Inicia sesión en Shalom Pro. Necesario antes de registrar envíos.',
			},
			{
				value: 'status',
				displayName: 'Estado de sesión',
				description: 'Consulta si la instancia tiene sesión activa en Shalom Pro.',
			},
			{
				value: 'logout',
				displayName: 'Cerrar sesión (Shalom Pro)',
				description: 'Cierra la sesión activa de la instancia.',
			},
		],
	},

	{
		name: 'autogestion',
		displayName: 'Autogestión',
		description: 'Gestiona una guía ya creada en Shalom Pro: clave de recojo, contacto, destino, devolución, retención, liberación y reparto a domicilio.',
		operations: [
			{
				value: 'pickupCode',
				displayName: 'Cambiar clave de recojo',
				description: 'Actualiza la clave de recojo de una guía pendiente (sin código de verificación).',
			},
			{
				value: 'start',
				displayName: 'Iniciar autogestión (envía el código)',
				description: 'Guarda el cambio y pide a Shalom el código por SMS o email. Devuelve un challengeId de 10 minutos.',
			},
			{
				value: 'confirm',
				displayName: 'Confirmar autogestión',
				description: 'Valida el código y aplica el cambio guardado en el challenge.',
			},
			{
				value: 'history',
				displayName: 'Historial de autogestiones',
				description: 'Lista las autogestiones hechas en la cuenta, con filtros por guía, tipo y fechas.',
			},
			{
				value: 'ubigeo',
				displayName: 'Ubigeo de reparto',
				description: 'Departamentos, provincias o distritos para pedir reparto a domicilio.',
			},
		],
	},
];

const instanceIdField: INodeProperties = {
	displayName: 'Instance ID',
	name: 'instanceId',
	type: 'string',
	default: '',
	description:
		'ID de la instancia (operaciones Shalom Pro). Puedes usar una expresión, p. ej. ={{ $json.instanceId }}.',
};

const orderNumberField: INodeProperties = {
	displayName: 'Número de guía',
	name: 'orderNumber',
	type: 'string',
	default: '',
	required: true,
	description: 'Número de guía / orden (8 dígitos).',
};

const orderCodeField: INodeProperties = {
	displayName: 'Código de seguridad',
	name: 'orderCode',
	type: 'string',
	default: '',
	required: true,
	description: 'Código de seguridad (4 caracteres).',
};

const guiaField: INodeProperties = {
	displayName: 'Número de guía',
	name: 'guia',
	type: 'string',
	default: '',
	required: true,
	description: 'Número de guía de la autogestión (6 a 12 dígitos).',
};

function getOperationFields(resource: string, operation: string): INodeProperties[] {
	switch (`${resource}/${operation}`) {
		case 'agencia/list':
			return [
				{
					displayName: 'Buscar',
					name: 'q',
					type: 'string',
					default: '',
					description: 'Filtra por departamento, provincia o zona.',
				},
			];

		case 'agencia/search':
			return [
				{
					displayName: 'Texto libre',
					name: 'q',
					type: 'string',
					default: '',
					description: 'Texto de búsqueda libre.',
				},
				{
					displayName: 'Departamento',
					name: 'departamento',
					type: 'string',
					default: '',
					description: 'Filtra por departamento.',
				},
				{
					displayName: 'Provincia',
					name: 'provincia',
					type: 'string',
					default: '',
					description: 'Filtra por provincia.',
				},
				{
					displayName: 'Aéreo',
					name: 'aereo',
					type: 'options',
					options: [
						{ name: 'Sin filtro', value: '' },
						{ name: 'true', value: 'true' },
						{ name: 'false', value: 'false' },
					],
					default: '',
					description: 'Filtra por habilitación aérea.',
				},
				{
					displayName: 'Cercanía (lat,lng)',
					name: 'near',
					type: 'string',
					default: '',
					description: 'Coordenadas "lat,lng" para ordenar por cercanía.',
				},
				{
					displayName: 'Radio (km)',
					name: 'radius_km',
					type: 'number',
					default: 0,
					description: 'Radio máximo de cobertura en kilómetros.',
				},
				{
					displayName: 'Por página',
					name: 'per_page',
					type: 'number',
					default: 100,
					description: 'Límite de resultados (1-500).',
				},
			];

		case 'ubicacion/departments':
			return [];

		case 'ubicacion/provinces':
			return [
				{
					displayName: 'ID del departamento',
					name: 'depId',
					type: 'number',
					default: 0,
					required: true,
					description: 'ID del departamento (ej. 15).',
				},
			];

		case 'ubicacion/districts':
			return [
				{
					displayName: 'ID del departamento',
					name: 'depId',
					type: 'number',
					default: 0,
					required: true,
					description: 'ID del departamento.',
				},
				{
					displayName: 'ID de la provincia',
					name: 'provId',
					type: 'number',
					default: 0,
					required: true,
					description: 'ID de la provincia.',
				},
			];

		case 'tracking/track':
			return [orderNumberField, orderCodeField];

		case 'tracking/trackBatch':
			return [
				{
					displayName: 'Órdenes',
					name: 'ordersValues',
					type: 'fixedCollection',
					typeOptions: { multipleValues: true },
					default: {},
					description: 'Lista de órdenes a rastrear (máx. 50).',
					options: [
						{
							name: 'orders',
							displayName: 'Orden',
							values: [
								{
									displayName: 'Número de guía',
									name: 'orderNumber',
									type: 'string',
									default: '',
									required: true,
									description: 'Número de guía (8 dígitos).',
								},
								{
									displayName: 'Código de seguridad',
									name: 'orderCode',
									type: 'string',
									default: '',
									required: true,
									description: 'Código de seguridad (4 caracteres).',
								},
							],
						},
					],
				},
			];

		case 'tracking/voucher':
			return [
				instanceIdField,
				orderNumberField,
				orderCodeField,
				{
					displayName: 'Formato',
					name: 'format',
					type: 'options',
					options: [
						{ name: 'PDF (ticket oficial)', value: 'pdf' },
						{ name: 'Imagen JPEG (para WhatsApp)', value: 'image' },
						{ name: 'Imagen PNG', value: 'png' },
					],
					default: 'pdf',
					description:
						'El ticket oficial se emite en PDF. Con imagen se rasteriza ese mismo PDF (JPEG para WhatsApp o PNG).',
				},
			];

		case 'tracking/label':
			return [instanceIdField, orderNumberField, orderCodeField];

		case 'cuenta/quote':
			return [
				{
					displayName: 'Origen',
					name: 'origin',
					type: 'string',
					default: '',
					required: true,
					description: 'ID o nombre del terminal de origen.',
				},
				{
					displayName: 'Destino',
					name: 'destination',
					type: 'string',
					default: '',
					required: true,
					description: 'ID o nombre del terminal de destino.',
				},
			];

		case 'cuenta/dni':
			return [
				{
					displayName: 'DNI',
					name: 'dni',
					type: 'string',
					default: '',
					required: true,
					description: 'Número de DNI (8 dígitos).',
				},
			];

		case 'cuenta/register':
			return [
				instanceIdField,
				{
					displayName: 'Origen',
					name: 'origen',
					type: 'number',
					default: 0,
					required: true,
					description: 'ID del terminal de origen.',
				},
				{
					displayName: 'Destino',
					name: 'destino',
					type: 'string',
					default: '',
					required: true,
					description: 'ID de la terminal. Usa prefijo "0" para aéreo (ej. "052").',
				},
				{
					displayName: 'Contenido',
					name: 'content',
					type: 'string',
					default: '',
					description: 'Nombre del producto (ej. SOBRE, PAQUETE XS). Automatiza tipo y costo.',
				},
				{
					displayName: 'Aéreo',
					name: 'aereo',
					type: 'options',
					options: [
						{ name: 'Autodetect (destino con 0)', value: '' },
						{ name: 'Terrestre', value: '0' },
						{ name: 'Aéreo', value: '1' },
					],
					default: '',
				},
				{
					displayName: 'Cantidad',
					name: 'cantidad',
					type: 'number',
					default: 1,
					description: 'Cantidad de bultos.',
				},
				{
					displayName: 'Documento del destinatario',
					name: 'documento',
					type: 'string',
					default: '',
					required: true,
					description: 'DNI del destinatario.',
				},
				{
					displayName: 'Nombres',
					name: 'name',
					type: 'string',
					default: '',
					required: true,
					description: 'Nombres del destinatario.',
				},
				{
					displayName: 'Primer apellido',
					name: 'firstname',
					type: 'string',
					default: '',
					required: true,
				},
				{
					displayName: 'Segundo apellido',
					name: 'lastname',
					type: 'string',
					default: '',
					required: true,
				},
				{
					displayName: 'Teléfono',
					name: 'phone',
					type: 'number',
					default: 0,
					required: true,
					description: 'Teléfono del destinatario (sin espacios).',
				},
				{
					displayName: 'Clave',
					name: 'clave',
					type: 'string',
					default: '',
					description: 'Clave de seguridad de 4 dígitos.',
				},
				{
					displayName: 'Tipo de pago',
					name: 'tipo_pago',
					type: 'string',
					default: '',
					description: 'Fijado a REMITENTE por defecto si se omite.',
				},
				{
					displayName: 'Tipo de producto',
					name: 'tipo_producto',
					type: 'number',
					default: 0,
					description: 'ID del tipo de producto.',
				},
				{
					displayName: 'Declaración jurada',
					name: 'declaracion_jurada',
					type: 'options',
					options: [
						{ name: 'Vacío', value: '' },
						{ name: 'Artículos de uso personal', value: 'Artículos de uso personal' },
						{ name: 'Documentos', value: 'Documentos' },
						{ name: 'Ropa', value: 'Ropa' },
						{ name: 'Electrodomésticos', value: 'Electrodomésticos' },
					],
					default: '',
				},
				{
					displayName: 'Peso',
					name: 'peso',
					type: 'string',
					default: '',
				},
				{
					displayName: 'Alto',
					name: 'alto',
					type: 'string',
					default: '',
				},
				{
					displayName: 'Largo',
					name: 'largo',
					type: 'string',
					default: '',
				},
				{
					displayName: 'Ancho',
					name: 'ancho',
					type: 'string',
					default: '',
				},
				{
					displayName: 'Costo',
					name: 'costo',
					type: 'number',
					default: 0,
					description: 'Opcional si se envía content (se calcula automáticamente).',
				},
				{
					displayName: 'Garantía',
					name: 'garantia',
					type: 'number',
					default: 0,
				},
				{
					displayName: 'Remitente',
					name: 'remitente',
					type: 'string',
					default: '',
					description: 'Opcional. Se obtiene del perfil si se omite.',
				},
				{
					displayName: 'Destinatario',
					name: 'destinatario',
					type: 'string',
					default: '',
					description: 'Opcional. Se completa con el campo documento.',
				},
				{
					displayName: 'Contacto documento',
					name: 'contacto_doc',
					type: 'string',
					default: '',
				},
				{
					displayName: 'Garantía monto',
					name: 'garantia_monto',
					type: 'string',
					default: '',
				},
			];

		case 'cuenta/registerBulk':
			return [
				instanceIdField,
				{
					displayName: 'Código de seguridad',
					name: 'securityCode',
					type: 'string',
					default: '',
					required: true,
					description: 'Clave de seguridad de 4 dígitos de la instancia.',
				},
				{
					displayName: 'Envíos',
					name: 'shipmentsValues',
					type: 'fixedCollection',
					typeOptions: { multipleValues: true },
					default: {},
					description: 'Lista de envíos a registrar.',
					options: [
						{
							name: 'shipments',
							displayName: 'Envío',
							values: [
								{
									displayName: 'Documento del destinatario',
									name: 'recipientDoc',
									type: 'string',
									default: '',
									required: true,
								},
								{
									displayName: 'Teléfono del destinatario',
									name: 'recipientPhone',
									type: 'string',
									default: '',
									required: true,
								},
								{
									displayName: 'Origen',
									name: 'origin',
									type: 'string',
									default: '',
									required: true,
								},
								{
									displayName: 'Destino',
									name: 'destination',
									type: 'string',
									default: '',
									required: true,
								},
								{
									displayName: 'Contenido',
									name: 'content',
									type: 'string',
									default: '',
									required: true,
									description: 'PAQUETE XS, SOBRE, etc.',
								},
								{
									displayName: 'Contacto documento',
									name: 'contactDoc',
									type: 'string',
									default: '',
								},
								{
									displayName: 'Contacto teléfono',
									name: 'contactPhone',
									type: 'string',
									default: '',
								},
								{
									displayName: 'GRR',
									name: 'grr',
									type: 'string',
									default: '',
								},
								{
									displayName: 'Alto',
									name: 'height',
									type: 'string',
									default: '',
								},
								{
									displayName: 'Ancho',
									name: 'width',
									type: 'string',
									default: '',
								},
								{
									displayName: 'Largo',
									name: 'length',
									type: 'string',
									default: '',
								},
								{
									displayName: 'Peso',
									name: 'weight',
									type: 'string',
									default: '',
								},
								{
									displayName: 'Cantidad',
									name: 'quantity',
									type: 'string',
									default: '',
								},
							],
						},
					],
				},
			];

		case 'cuenta/pendingShipments':
		case 'cuenta/getUser':
		case 'instancia/status':
		case 'instancia/logout':
			return [instanceIdField];

		case 'instancia/create':
			return [
				{
					displayName: 'Nombre',
					name: 'name',
					type: 'string',
					default: '',
					description: 'Nombre descriptivo de la instancia (opcional).',
				},
			];

		case 'instancia/list':
			return [];

		case 'instancia/delete':
			return [instanceIdField];

		case 'instancia/login':
			return [
				instanceIdField,
				{
					displayName: 'Usuario',
					name: 'username',
					type: 'string',
					default: '',
					required: true,
					description: 'Usuario/email de Shalom Pro.',
				},
				{
					displayName: 'Contraseña',
					name: 'password',
					type: 'string',
					default: '',
					required: true,
					description: 'Contraseña de Shalom Pro.',
				},
			];

		case 'autogestion/pickupCode':
			return [
				instanceIdField,
				guiaField,
				{
					displayName: 'Código de seguridad de la guía',
					name: 'codigo',
					type: 'string',
					default: '',
					description:
						'Recomendado: con el código la clave se puede cambiar con el envío en ruta, en destino o entregado. Sin él solo aplica a envíos pendientes.',
				},
				{
					displayName: 'Nueva clave de recojo',
					name: 'clave',
					type: 'string',
					default: '',
					required: true,
					description: 'Clave de recojo de 4 dígitos.',
				},
			];

		case 'autogestion/start':
			return [
				instanceIdField,
				guiaField,
				{
					displayName: 'Código de seguridad de la guía',
					name: 'codigo',
					type: 'string',
					default: '',
					description: 'Recomendado: con el código la autogestión funciona con la guía en ruta, en destino o entregada (Shalom decide qué se permite). Sin él solo aplica a envíos pendientes.',
				},
				{
					displayName: 'Tipo de autogestión',
					name: 'tipo',
					type: 'options',
					default: 'cambiar_contacto',
					description: 'Cambio que se aplicará sobre la guía. Shalom exige que esté en la agencia destino salvo en agregar contacto.',
					options: [
						{ name: 'Agregar contacto', value: 'cambiar_contacto' },
						{ name: 'Cambio de destino', value: 'cambio_destino' },
						{ name: 'Devolución de mercadería', value: 'devolucion_mercaderia' },
						{ name: 'Retención de entrega', value: 'retencion_entrega' },
						{ name: 'Liberación de carga', value: 'liberacion_carga' },
						{ name: 'Reparto a domicilio', value: 'reparto_domicilio' },
					],
				},
				{
					displayName: 'Teléfono',
					name: 'telefono',
					type: 'string',
					default: '',
					required: true,
					description: 'Teléfono de 9 dígitos que recibe y valida el código.',
				},
				{
					displayName: 'Canal del código',
					name: 'canal',
					type: 'options',
					default: 'sms',
					options: [
						{ name: 'SMS', value: 'sms' },
						{ name: 'Email', value: 'email' },
					],
				},
				{
					displayName: 'Email',
					name: 'email',
					type: 'string',
					default: '',
					displayOptions: { show: { canal: ['email'] } },
					description: 'Correo que recibe el código cuando el canal es email.',
				},
				{
					displayName: 'Documento del destinatario',
					name: 'destinatario',
					type: 'string',
					default: '',
					displayOptions: { show: { tipo: ['cambiar_contacto', 'cambio_destino', 'devolucion_mercaderia'] } },
					description: 'Obligatorio en agregar contacto; en destino y devolución se toma del envío pendiente si no lo envías.',
				},
				{
					displayName: 'Agencia destino',
					name: 'destino',
					type: 'string',
					default: '',
					displayOptions: { show: { tipo: ['cambio_destino', 'devolucion_mercaderia'] } },
					description: 'ter_id o nombre de la agencia destino (debe estar habilitada para recibir envíos).',
				},
				{
					displayName: 'Dirección de entrega',
					name: 'direccion',
					type: 'string',
					default: '',
					displayOptions: { show: { tipo: ['reparto_domicilio'] } },
				},
				{
					displayName: 'Departamento (dep_id)',
					name: 'dep_id',
					type: 'number',
					default: 0,
					displayOptions: { show: { tipo: ['reparto_domicilio'] } },
				},
				{
					displayName: 'Provincia (prov_id)',
					name: 'prov_id',
					type: 'number',
					default: 0,
					displayOptions: { show: { tipo: ['reparto_domicilio'] } },
				},
				{
					displayName: 'Distrito (dist_id)',
					name: 'dist_id',
					type: 'number',
					default: 0,
					displayOptions: { show: { tipo: ['reparto_domicilio'] } },
				},
				{
					displayName: 'Tarifa de reparto (rate)',
					name: 'rate',
					type: 'number',
					default: 0,
					displayOptions: { show: { tipo: ['reparto_domicilio'] } },
					description: 'Importe que Shalom cotiza para el reparto.',
				},
				{
					displayName: 'Tarifa de etiqueta (label_rate)',
					name: 'label_rate',
					type: 'number',
					default: 0,
					displayOptions: { show: { tipo: ['reparto_domicilio'] } },
				},
			];

		case 'autogestion/confirm':
			return [
				instanceIdField,
				{
					displayName: 'Challenge ID',
					name: 'challengeId',
					type: 'string',
					default: '',
					required: true,
					description: 'Identificador que devolvió la autogestión al enviar el código.',
				},
				{
					displayName: 'Código recibido',
					name: 'clave',
					type: 'string',
					default: '',
					required: true,
					description: 'Código alfanumérico de 4 a 8 caracteres que llegó por SMS o email.',
				},
			];

		case 'autogestion/history':
			return [
				instanceIdField,
				{
					displayName: 'Guía',
					name: 'guia',
					type: 'string',
					default: '',
					description: 'Filtra por número de guía.',
				},
				{
					displayName: 'Tipo',
					name: 'tipo',
					type: 'options',
					default: '',
					options: [
						{ name: 'Todos', value: '' },
						{ name: 'Agregar contacto', value: 'cambiar_contacto' },
						{ name: 'Cambio de destino', value: 'cambio_destino' },
						{ name: 'Actualización de clave', value: 'cambio_clave' },
						{ name: 'Devolución de mercadería', value: 'devolucion_mercaderia' },
						{ name: 'Retención de entrega', value: 'retencion_entrega' },
						{ name: 'Reparto a domicilio', value: 'reparto_domicilio' },
					],
				},
				{
					displayName: 'Desde',
					name: 'desde',
					type: 'string',
					default: '',
					description: 'Fecha inicial (YYYY-MM-DD).',
				},
				{
					displayName: 'Hasta',
					name: 'hasta',
					type: 'string',
					default: '',
					description: 'Fecha final (YYYY-MM-DD).',
				},
				{
					displayName: 'Página',
					name: 'page',
					type: 'number',
					default: 0,
				},
				{
					displayName: 'Por página',
					name: 'per_page',
					type: 'number',
					default: 0,
				},
			];

		case 'autogestion/ubigeo':
			return [
				instanceIdField,
				{
					displayName: 'Departamento (dep_id)',
					name: 'dep_id',
					type: 'number',
					default: 0,
					description: 'Sin valor devuelve los departamentos.',
				},
				{
					displayName: 'Provincia (prov_id)',
					name: 'prov_id',
					type: 'number',
					default: 0,
					description: 'Requiere dep_id; con ambos devuelve los distritos.',
				},
			];

		default:
			return [];
	}
}

function buildProperties(): INodeProperties[] {
	const properties: INodeProperties[] = [];

	properties.push({
		displayName: 'Recurso',
		name: 'resource',
		type: 'options',
		noDataExpression: true,
		required: true,
		default: 'agencia',
		options: RESOURCES.map((resource) => ({
			name: resource.displayName,
			value: resource.name,
			description: resource.description,
		})),
	});

	for (const resource of RESOURCES) {
		properties.push({
			displayName: 'Operación',
			name: 'operation',
			type: 'options',
			noDataExpression: true,
			required: true,
			default: resource.operations[0].value,
			displayOptions: { show: { resource: [resource.name] } },
			options: resource.operations.map((operation) => ({
				name: operation.displayName,
				value: operation.value,
				description: operation.description,
			})),
		});
	}

	for (const resource of RESOURCES) {
		for (const operation of resource.operations) {
			const fields = getOperationFields(resource.name, operation.value);
			for (const field of fields) {
				properties.push({
					...field,
					displayOptions: {
						show: {
							resource: [resource.name],
							operation: [operation.value],
						},
					},
				});
			}
		}
	}

	return properties;
}

export class ShalomApi implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Shalom API',
		name: 'shalomApi',
		icon: 'file:icons/shalom.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + " · " + $parameter["resource"]}}',
		description:
			'Consume la API de Shalom: agencias, ubicaciones, tracking, cuentas, instancias y autogestiones.',
		defaults: { name: 'Shalom API' },
		inputs: ['main'],
		outputs: ['main'],
		credentials: [{ name: 'shalomApiApi', required: true }],
		properties: buildProperties(),
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const credentials = (await this.getCredentials(
			'shalomApiApi',
		)) as unknown as ShalomCredentials;
		const baseUrl = String(credentials.baseUrl || 'https://api.shalom-api.lat').replace(/\/+$/, '');
		const request = this.helpers.httpRequestWithAuthentication.bind(this);

		const getInstanceId = (itemIndex: number): string =>
			String(this.getNodeParameter('instanceId', itemIndex, '') ?? '').trim();

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const resource = this.getNodeParameter('resource', itemIndex) as string;
				const operation = this.getNodeParameter('operation', itemIndex) as string;

				switch (`${resource}/${operation}`) {
					case 'agencia/list': {
						const q = String(this.getNodeParameter('q', itemIndex, '') ?? '');
						const qs: IDataObject = {};
						if (q) qs.q = q;
						const response = await request('shalomApiApi', {
							method: 'GET',
							url: `${baseUrl}/agencies`,
							qs,
							json: true,
						});
						returnData.push({ json: response as unknown as IDataObject });
						break;
					}

					case 'agencia/search': {
						const qs: IDataObject = {};
						for (const key of ['q', 'departamento', 'provincia', 'aereo', 'near']) {
							const value = String(this.getNodeParameter(key, itemIndex, '') ?? '');
							if (value !== '') qs[key] = value;
						}
						const radiusKm = Number(this.getNodeParameter('radius_km', itemIndex, 0));
						if (radiusKm > 0) qs.radius_km = radiusKm;
						const perPage = Number(this.getNodeParameter('per_page', itemIndex, 100));
						if (perPage > 0) qs.per_page = perPage;
						const response = await request('shalomApiApi', {
							method: 'GET',
							url: `${baseUrl}/agencies/search`,
							qs,
							json: true,
						});
						returnData.push({ json: response as unknown as IDataObject });
						break;
					}

					case 'ubicacion/departments': {
						const response = await request('shalomApiApi', {
							method: 'GET',
							url: `${baseUrl}/locations/departments`,
							json: true,
						});
						returnData.push({ json: response as unknown as IDataObject });
						break;
					}

					case 'ubicacion/provinces': {
						const depId = Number(this.getNodeParameter('depId', itemIndex, 0));
						const response = await request('shalomApiApi', {
							method: 'GET',
							url: `${baseUrl}/locations/departments/${depId}/provinces`,
							json: true,
						});
						returnData.push({ json: response as unknown as IDataObject });
						break;
					}

					case 'ubicacion/districts': {
						const depId = Number(this.getNodeParameter('depId', itemIndex, 0));
						const provId = Number(this.getNodeParameter('provId', itemIndex, 0));
						const response = await request('shalomApiApi', {
							method: 'GET',
							url: `${baseUrl}/locations/departments/${depId}/provinces/${provId}/districts`,
							json: true,
						});
						returnData.push({ json: response as unknown as IDataObject });
						break;
					}

					case 'tracking/track': {
						const body: IDataObject = {
							orderNumber: String(this.getNodeParameter('orderNumber', itemIndex, '')),
							orderCode: String(this.getNodeParameter('orderCode', itemIndex, '')),
						};
						const response = await request('shalomApiApi', {
							method: 'POST',
							url: `${baseUrl}/track`,
							body,
							json: true,
						});
						returnData.push({ json: response as unknown as IDataObject });
						break;
					}

					case 'tracking/trackBatch': {
						const ordersCollection = this.getNodeParameter('ordersValues', itemIndex, {
						}) as { orders?: Array<IDataObject> };
						const orders = (ordersCollection.orders ?? []).map((order) => ({
							orderNumber: String(order.orderNumber ?? ''),
							orderCode: String(order.orderCode ?? ''),
						}));
						const response = await request('shalomApiApi', {
							method: 'POST',
							url: `${baseUrl}/track/batch`,
							body: { orders },
							json: true,
						});
						returnData.push({ json: response as unknown as IDataObject });
						break;
					}

					case 'tracking/voucher':
					case 'tracking/label': {
						const isVoucher = operation === 'voucher';
						const instanceId = getInstanceId(itemIndex);
						const orderNumber = String(this.getNodeParameter('orderNumber', itemIndex, ''));
						const orderCode = String(this.getNodeParameter('orderCode', itemIndex, ''));
						const qs: IDataObject = { instanceId, orderNumber, orderCode };
						// El ticket oficial solo existe en PDF: con format=image la API
						// devuelve ese mismo ticket rasterizado (JPEG para WhatsApp) o PNG.
						const format = isVoucher
							? String(this.getNodeParameter('format', itemIndex, 'pdf'))
							: 'pdf';
						if (isVoucher) qs.format = format;
						const mimeType = format === 'png' ? 'image/png' : format === 'pdf' ? 'application/pdf' : 'image/jpeg';
						const extension = format === 'png' ? 'png' : format === 'pdf' ? 'pdf' : 'jpg';
						const path = isVoucher ? 'voucher' : 'label';
						const fileName = `${path}-${orderNumber}.${extension}`;
						const buffer = await request('shalomApiApi', {
							method: 'GET',
							url: `${baseUrl}/track/${path}`,
							qs,
							json: false,
							encoding: null,
						} as unknown as IHttpRequestOptions);
						const binaryData = await this.helpers.prepareBinaryData(
							buffer as Buffer,
							fileName,
							mimeType,
						);
						returnData.push({
							json: { fileName, mimeType, orderNumber },
							binary: { data: binaryData },
						});
						break;
					}

					case 'cuenta/quote': {
						const body: IDataObject = {
							origin: String(this.getNodeParameter('origin', itemIndex, '')),
							destination: String(this.getNodeParameter('destination', itemIndex, '')),
						};
						const response = await request('shalomApiApi', {
							method: 'POST',
							url: `${baseUrl}/account/quote`,
							body,
							json: true,
						});
						returnData.push({ json: response as unknown as IDataObject });
						break;
					}

					case 'cuenta/dni': {
						const dni = String(this.getNodeParameter('dni', itemIndex, ''));
						const response = await request('shalomApiApi', {
							method: 'GET',
							url: `${baseUrl}/account/dni/${dni}`,
							json: true,
						});
						returnData.push({ json: response as unknown as IDataObject });
						break;
					}

					case 'cuenta/register': {
						const instanceId = getInstanceId(itemIndex);
						const body: RegisterShipmentBody = {
							instanceId,
							origen: Number(this.getNodeParameter('origen', itemIndex, 0)),
							destino: String(this.getNodeParameter('destino', itemIndex, '')),
							documento: String(this.getNodeParameter('documento', itemIndex, '')),
							name: String(this.getNodeParameter('name', itemIndex, '')),
							firstname: String(this.getNodeParameter('firstname', itemIndex, '')),
							lastname: String(this.getNodeParameter('lastname', itemIndex, '')),
							phone: Number(this.getNodeParameter('phone', itemIndex, 0)),
						};

						const optionalStrings: string[] = [
							'content',
							'clave',
							'tipo_pago',
							'declaracion_jurada',
							'peso',
							'alto',
							'largo',
							'ancho',
							'remitente',
							'destinatario',
							'contacto_doc',
							'garantia_monto',
						];
						for (const key of optionalStrings) {
							const value = String(this.getNodeParameter(key, itemIndex, '') ?? '');
							if (value !== '') (body as unknown as IDataObject)[key] = value;
						}

						const optionalNumbers: string[] = [
							'cantidad',
							'tipo_producto',
							'costo',
							'garantia',
						];
						for (const key of optionalNumbers) {
							const value = Number(this.getNodeParameter(key, itemIndex, 0));
							if (value !== 0) (body as unknown as IDataObject)[key] = value;
						}

						const aereo = this.getNodeParameter('aereo', itemIndex, '');
						if (aereo !== '') (body as unknown as IDataObject).aereo = Number(aereo);

						const response = await request('shalomApiApi', {
							method: 'POST',
							url: `${baseUrl}/account/register`,
							body: body as unknown as IDataObject,
							json: true,
						});
						returnData.push({ json: response as unknown as IDataObject });
						break;
					}

					case 'cuenta/registerBulk': {
						const instanceId = getInstanceId(itemIndex);
						const securityCode = String(this.getNodeParameter('securityCode', itemIndex, ''));
						const shipmentsCollection = this.getNodeParameter('shipmentsValues', itemIndex, {
						}) as { shipments?: Array<IDataObject> };
						const body: IDataObject = {
							instanceId,
							securityCode,
							shipments: shipmentsCollection.shipments ?? [],
						};
						const response = await request('shalomApiApi', {
							method: 'POST',
							url: `${baseUrl}/account/register-bulk`,
							body,
							json: true,
						});
						returnData.push({ json: response as unknown as IDataObject });
						break;
					}

					case 'cuenta/pendingShipments': {
						const instanceId = getInstanceId(itemIndex);
						const response = await request('shalomApiApi', {
							method: 'POST',
							url: `${baseUrl}/account/pending-shipments`,
							body: { instanceId },
							json: true,
						});
						returnData.push({ json: response as unknown as IDataObject });
						break;
					}

					case 'cuenta/getUser': {
						const instanceId = getInstanceId(itemIndex);
						const response = await request('shalomApiApi', {
							method: 'POST',
							url: `${baseUrl}/account/get-user`,
							body: { instanceId },
							json: true,
						});
						returnData.push({ json: response as unknown as IDataObject });
						break;
					}

					case 'instancia/create': {
						const name = String(this.getNodeParameter('name', itemIndex, '') ?? '');
						const body: IDataObject = {};
						if (name) body.name = name;
						const response = await request('shalomApiApi', {
							method: 'POST',
							url: `${baseUrl}/instances`,
							body,
							json: true,
						});
						returnData.push({ json: response as unknown as IDataObject });
						break;
					}

					case 'instancia/list': {
						const response = await request('shalomApiApi', {
							method: 'GET',
							url: `${baseUrl}/instances`,
							json: true,
						});
						returnData.push({ json: response as unknown as IDataObject });
						break;
					}

					case 'instancia/delete': {
						const instanceId = getInstanceId(itemIndex);
						const response = await request('shalomApiApi', {
							method: 'DELETE',
							url: `${baseUrl}/instances`,
							body: { instanceId },
							json: true,
						});
						returnData.push({ json: response as unknown as IDataObject });
						break;
					}

					case 'instancia/login': {
						const instanceId = getInstanceId(itemIndex);
						const body: IDataObject = {
							instanceId,
							username: String(this.getNodeParameter('username', itemIndex, '')),
							password: String(this.getNodeParameter('password', itemIndex, '')),
						};
						const response = await request('shalomApiApi', {
							method: 'POST',
							url: `${baseUrl}/instances/login`,
							body,
							json: true,
						});
						returnData.push({ json: response as unknown as IDataObject });
						break;
					}

					case 'instancia/status': {
						const instanceId = getInstanceId(itemIndex);
						const response = await request('shalomApiApi', {
							method: 'POST',
							url: `${baseUrl}/instances/status`,
							body: { instanceId },
							json: true,
						});
						returnData.push({ json: response as unknown as IDataObject });
						break;
					}

					case 'instancia/logout': {
						const instanceId = getInstanceId(itemIndex);
						const response = await request('shalomApiApi', {
							method: 'POST',
							url: `${baseUrl}/instances/logout`,
							body: { instanceId },
							json: true,
						});
						returnData.push({ json: response as unknown as IDataObject });
						break;
					}

					case 'autogestion/pickupCode': {
						const instanceId = getInstanceId(itemIndex);
						const body: IDataObject = {
							instanceId,
							guia: String(this.getNodeParameter('guia', itemIndex, '')),
							clave: String(this.getNodeParameter('clave', itemIndex, '')),
						};
						const codigoPickup = String(this.getNodeParameter('codigo', itemIndex, '')).trim();
						if (codigoPickup) body.codigo = codigoPickup;
						const response = await request('shalomApiApi', {
							method: 'POST',
							url: `${baseUrl}/shipments/pickup-code`,
							body,
							json: true,
						});
						returnData.push({ json: response as unknown as IDataObject });
						break;
					}

					case 'autogestion/start': {
						const instanceId = getInstanceId(itemIndex);
						const body: IDataObject = {
							instanceId,
							guia: String(this.getNodeParameter('guia', itemIndex, '')),
							tipo: String(this.getNodeParameter('tipo', itemIndex, '')),
							telefono: String(this.getNodeParameter('telefono', itemIndex, '')),
						};

						const canal = String(this.getNodeParameter('canal', itemIndex, 'sms') ?? '');
						if (canal) body.canal = canal;

						for (const key of ['codigo', 'email', 'destinatario', 'destino', 'direccion']) {
							const value = String(this.getNodeParameter(key, itemIndex, '') ?? '');
							if (value !== '') body[key] = value;
						}

						for (const key of ['dep_id', 'prov_id', 'dist_id', 'rate', 'label_rate']) {
							const value = Number(this.getNodeParameter(key, itemIndex, 0));
							if (value > 0) body[key] = value;
						}

						const response = await request('shalomApiApi', {
							method: 'POST',
							url: `${baseUrl}/shipments/self-management`,
							body,
							json: true,
						});
						returnData.push({ json: response as unknown as IDataObject });
						break;
					}

					case 'autogestion/confirm': {
						const instanceId = getInstanceId(itemIndex);
						const response = await request('shalomApiApi', {
							method: 'POST',
							url: `${baseUrl}/shipments/self-management/confirm`,
							body: {
								instanceId,
								challengeId: String(this.getNodeParameter('challengeId', itemIndex, '')),
								clave: String(this.getNodeParameter('clave', itemIndex, '')),
							},
							json: true,
						});
						returnData.push({ json: response as unknown as IDataObject });
						break;
					}

					case 'autogestion/history': {
						const instanceId = getInstanceId(itemIndex);
						const qs: IDataObject = { instanceId };

						for (const key of ['guia', 'tipo', 'desde', 'hasta']) {
							const value = String(this.getNodeParameter(key, itemIndex, '') ?? '');
							if (value !== '') qs[key] = value;
						}

						for (const key of ['page', 'per_page']) {
							const value = Number(this.getNodeParameter(key, itemIndex, 0));
							if (value > 0) qs[key] = value;
						}

						const response = await request('shalomApiApi', {
							method: 'GET',
							url: `${baseUrl}/shipments/self-management`,
							qs,
							json: true,
						});
						returnData.push({ json: response as unknown as IDataObject });
						break;
					}

					case 'autogestion/ubigeo': {
						const instanceId = getInstanceId(itemIndex);
						const qs: IDataObject = { instanceId };

						for (const key of ['dep_id', 'prov_id']) {
							const value = Number(this.getNodeParameter(key, itemIndex, 0));
							if (value > 0) qs[key] = value;
						}

						const response = await request('shalomApiApi', {
							method: 'GET',
							url: `${baseUrl}/shipments/home-delivery/ubigeo`,
							qs,
							json: true,
						});
						returnData.push({ json: response as unknown as IDataObject });
						break;
					}

					default:
						throw new NodeOperationError(
							this.getNode(),
							`Operación no soportada: ${resource}/${operation}`,
						);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					const errorMessage =
						error instanceof Error ? error.message : 'Error desconocido';
					returnData.push({ json: { error: errorMessage } });
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
