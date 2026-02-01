"use client";

import { useEffect } from "react";
import { apiClient } from "@/lib/api/client";
import { UserRole } from "@/types/api";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface RoleSwitcherProps {
    currentRole?: UserRole;
    onChange?: (role: UserRole) => void;
}

export function RoleSwitcher({ currentRole = "L2", onChange }: RoleSwitcherProps) {

    useEffect(() => {
        // Sync API client whenever role changes
        apiClient.setUser("user-1", currentRole);
    }, [currentRole]);

    return (
        <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Dev Mode</span>
            <Select
                value={currentRole}
                onValueChange={(value) => onChange?.(value as UserRole)}
            >
                <SelectTrigger className="w-[140px] h-8 text-xs">
                    <SelectValue placeholder="Select Role" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="L2">
                        <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="px-1 py-0 text-[10px]">L2</Badge>
                            <span className="text-xs">Support</span>
                        </div>
                    </SelectItem>
                    <SelectItem value="DEV">
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="px-1 py-0 text-[10px] border-indigo-500 text-indigo-500">DEV</Badge>
                            <span className="text-xs">Developer</span>
                        </div>
                    </SelectItem>
                    <SelectItem value="ML">
                        <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="px-1 py-0 text-[10px] bg-purple-600 text-white hover:bg-purple-700">ML</Badge>
                            <span className="text-xs">Specialist</span>
                        </div>
                    </SelectItem>
                </SelectContent>
            </Select>
        </div>
    );
}
