import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Filter, Check } from 'lucide-react';

const ProcessList = () => {
    const navigate = useNavigate();

    const processes = [
        {
            "id": "1",
            "stockId": "Extracting Data from 1st to 15th March",
            "name": "Cash",
            "year": "2025-12-02",
            "make": "Complete"
        },
        {
            "id": "2",
            "stockId": "Extracting Weekly data for all of March",
            "name": "Payouts",
            "year": "2025-12-02",
            "make": "Complete"
        },
        {
            "id": "3",
            "stockId": "Updating Payroll and Customer receipts in the Liquidity plan",
            "name": "Payments",
            "year": "2025-12-02",
            "make": "Complete"
        },
        {
            "id": "4",
            "stockId": "Updating Tax and VAT values in the Liquidity Plan",
            "name": "Tax Revenue",
            "year": "2025-12-02",
            "make": "Complete"
        }
    ];

    const tabs = [
        { name: 'Needs Attention', count: 0, color: 'text-orange-500', icon: 'square' },
        { name: 'Void', count: 0, color: 'text-gray-400', icon: 'square' },
        { name: 'In Progress', count: 0, color: 'text-blue-500', icon: 'square' },
        { name: 'Done', count: 4, color: 'text-green-500', icon: 'square', active: true },
    ];

    return (
        <div className="p-6">

            {/* Filters Bar */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex space-x-6">
                    {tabs.map((tab) => (
                        <button
                            key={tab.name}
                            className={`flex items-center text-xs font-medium ${tab.active
                                ? 'bg-green-50 text-green-700 px-2 py-1 rounded border border-green-100'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <div className={`w-2 h-2 mr-2 border ${tab.name === 'Needs Attention' ? 'border-orange-400 bg-orange-50' :
                                tab.name === 'Void' ? 'border-gray-400 bg-gray-50' :
                                    tab.name === 'In Progress' ? 'border-blue-400 bg-blue-50' :
                                        'border-green-400 bg-green-50'
                                }`}></div>
                            {tab.name}
                            <span className="ml-1.5 text-gray-400">{tab.count}</span>
                        </button>
                    ))}
                </div>

                <button className="flex items-center text-xs font-medium text-gray-600 hover:text-gray-900">
                    <Filter className="w-3.5 h-3.5 mr-1.5" />
                    Filter
                </button>
            </div>

            {/* Table */}
            <div className="bg-white">
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead>
                            <tr className="border-b border-gray-100">
                                <th className="w-12 px-4 py-3"></th>
                                <th className="px-4 py-3 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">Task</th>
                                <th className="px-4 py-3 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">Team</th>
                                <th className="px-4 py-3 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">Processing Date</th>
                                <th className="px-4 py-3 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {processes.map((process) => (
                                <tr
                                    key={process.id}
                                    className="hover:bg-gray-50 cursor-pointer transition-colors group"
                                    onClick={() => navigate(`/done/process/${process.id}`)}
                                >
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <Check
                                            className="w-4 h-4 text-green-600"
                                        />
                                    </td>

                                    <td className="px-4 py-3 whitespace-nowrap text-[11px] text-gray-900 font-medium">{process.stockId}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-[11px] text-gray-900">{process.name}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-[11px] text-gray-900">{process.year}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-[11px] text-gray-900">{process.make}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ProcessList;