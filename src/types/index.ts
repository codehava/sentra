export type UserRole = 'ADMIN' | 'MAKER' | 'APPROVER' | 'VALIDATOR' | 'USER1' | 'USER2' | 'USER3' | 'USER4';

export interface User {
    id: string;
    nip: string;
    fullName: string;
    email: string;
    roleId: number;
    role?: Role;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface Role {
    id: number;
    code: UserRole;
    name: string;
    description?: string;
}

export interface TransactionType {
    id: number;
    code: string;
    name: string;
    icon: string;
    description?: string;
    isActive: boolean;
}

export interface FieldMaster {
    id: number;
    code: string;
    name: string;
    type: 'text' | 'number' | 'currency' | 'date' | 'file' | 'select' | 'textarea';
    options?: { label: string; value: string }[];
    validationRules?: Record<string, unknown>;
}

export interface RoutingMatrix {
    id: number;
    transactionTypeId: number;
    stageOrder: number;
    stageCode: string;
    stageName: string;
    roleId: number;
    isFinal: boolean;
}

export interface FieldAccessMatrix {
    id: number;
    transactionTypeId: number;
    fieldId: number;
    stageCode: string;
    isVisible: boolean;
    isEditable: boolean;
    isMandatory: boolean;
}

export interface Transaction {
    id: string;
    transactionTypeId: number;
    transactionType?: TransactionType;
    ticketNumber: string;
    currentStage: string;
    status: 'OPEN' | 'CLOSED' | 'REJECTED';
    data: Record<string, unknown>;
    createdBy: string;
    creator?: User;
    stageStartedAt: string;
    stageSlaDeadline?: string;
    slaStatus: 'ON_TRACK' | 'WARNING' | 'AT_RISK' | 'BREACHED';
    isSlaBreach: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface TransactionHistory {
    id: string;
    transactionId: string;
    stageCode: string;
    action: 'CREATED' | 'APPROVED' | 'REJECTED' | 'RETURNED';
    actionBy: string;
    actor?: User;
    comment?: string;
    dataSnapshot?: Record<string, unknown>;
    createdAt: string;
}

export interface Notification {
    id: string;
    userId: string;
    type: 'NEW_TASK' | 'APPROVED' | 'REJECTED' | 'SLA_WARNING' | 'SLA_BREACH';
    title: string;
    message: string;
    data?: Record<string, unknown>;
    isRead: boolean;
    createdAt: string;
}
