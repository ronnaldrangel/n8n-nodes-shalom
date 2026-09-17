export interface Order {
	orderNumber: string;
	orderCode: string;
}

export interface ShipmentItem {
	recipientDoc: string;
	recipientPhone: string;
	contactDoc?: string;
	contactPhone?: string;
	grr?: string;
	origin: string;
	destination: string;
	content: string;
	height?: string;
	width?: string;
	length?: string;
	weight?: string;
	quantity?: string;
}

export interface QuoteBody {
	origin: number | string;
	destination: number | string;
}

export interface ShalomCredentials {
	baseUrl?: string;
	apiKey?: string;
}

/** Campos de la operación registrar individual (véase registerIndividualSchema). */
export interface RegisterShipmentBody {
	instanceId?: string;
	origen?: number | string;
	destino?: number | string;
	aereo?: number;
	tipo_pago?: string;
	tipo_producto?: number;
	cantidad?: number;
	peso?: string;
	alto?: string;
	largo?: string;
	ancho?: string;
	costo?: number;
	declaracion_jurada?: string;
	content?: string;
	documento?: string;
	name?: string;
	firstname?: string;
	lastname?: string;
	phone?: number | string;
	remitente?: string;
	destinatario?: string;
	remitente_id?: number;
	destinatario_id?: number;
	garantia?: number;
	garantia_costo?: number;
	garantia_monto?: string;
	contacto_doc?: string;
	grrs?: string;
	clave?: string;
	servicio_cobranza?: number;
}