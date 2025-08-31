import React from "react";

export function PanelTitle({ title }: { title: string }) {
    return (
        <div className="px-3 py-2 border-b border-gray-200 bg-gray-50">
            <h3 className="text-xs font-semibold text-gray-600 tracking-wide">
                {title}
            </h3>
        </div>
    );
}