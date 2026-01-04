import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getTransactionTypes } from '@/services/transaction-types.service';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Wallet, FileText, FileCheck, Share2, User, Building, Landmark, RefreshCw, Settings } from 'lucide-react';

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
    wallet: Wallet,
    'file-text': FileText,
    'file-minus': FileCheck,
    share: Share2,
    user: User,
    building: Building,
    landmark: Landmark,
    'refresh-cw': RefreshCw,
    settings: Settings,
};

export function SelectTransactionTypePage() {
    const navigate = useNavigate();

    const { data: types = [], isLoading } = useQuery({
        queryKey: ['transaction-types'],
        queryFn: getTransactionTypes,
    });

    const activeTypes = types.filter((t: any) => t.is_active);

    const handleSelect = (typeCode: string) => {
        navigate(`/create/${typeCode}`);
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold">Create Transaction</h1>
                <p className="text-muted-foreground">Pilih jenis transaksi yang akan dibuat</p>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {activeTypes.map((type: any) => {
                        const IconComponent = ICONS[type.icon] || FileText;
                        return (
                            <Card
                                key={type.id}
                                className="cursor-pointer transition-all hover:border-primary hover:shadow-md"
                                onClick={() => handleSelect(type.code)}
                            >
                                <CardHeader className="flex flex-row items-center gap-4 pb-2">
                                    <div className="p-3 rounded-lg bg-primary/10">
                                        <IconComponent className="h-6 w-6 text-primary" />
                                    </div>
                                    <div className="flex-1">
                                        <Badge variant="outline" className="mb-1">{type.code}</Badge>
                                        <CardTitle className="text-lg">{type.name}</CardTitle>
                                    </div>
                                </CardHeader>
                                {type.description && (
                                    <CardContent>
                                        <CardDescription>{type.description}</CardDescription>
                                    </CardContent>
                                )}
                            </Card>
                        );
                    })}
                </div>
            )}

            {!isLoading && activeTypes.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Tidak ada jenis transaksi yang tersedia</p>
                </div>
            )}
        </div>
    );
}
