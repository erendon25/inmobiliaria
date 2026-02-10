import { useState } from 'react';
import { properties as initialProperties } from '../data/properties';
import { Link } from 'react-router-dom';
import { Plus, Edit, Trash2, ArrowLeft } from 'lucide-react';

const ManageProperties = () => {
    const [properties, setProperties] = useState(initialProperties);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProperty, setEditingProperty] = useState(null);

    const handleDelete = (id) => {
        if (window.confirm('Are you sure you want to delete this property?')) {
            setProperties(properties.filter(p => p.id !== id));
        }
    };

    const handleEdit = (property) => {
        setEditingProperty(property);
        setIsModalOpen(true);
    };

    const handleAddNew = () => {
        setEditingProperty(null);
        setIsModalOpen(true);
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <nav className="bg-white shadow sticky top-0 z-50">
                <div className="container mx-auto px-6 py-4 flex justify-between items-center">
                    <Link to="/" className="text-primary font-bold flex items-center gap-2 hover:text-secondary transition">
                        <ArrowLeft className="w-5 h-5" /> Back to Site
                    </Link>
                    <div className="text-xl font-bold text-gray-800">Property Manager Dashboard</div>
                    <div className="w-8"></div> {/* Spacer */}
                </div>
            </nav>

            <div className="container mx-auto px-6 py-10">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-800">My Properties</h1>
                    <button
                        onClick={handleAddNew}
                        className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-lg hover:bg-opacity-90 transition shadow-md"
                    >
                        <Plus className="w-5 h-5" /> Add Property
                    </button>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="p-4 font-semibold text-gray-600">Image</th>
                                <th className="p-4 font-semibold text-gray-600">Title</th>
                                <th className="p-4 font-semibold text-gray-600">Price</th>
                                <th className="p-4 font-semibold text-gray-600">Location</th>
                                <th className="p-4 font-semibold text-gray-600 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {properties.map((property) => (
                                <tr key={property.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                                    <td className="p-4">
                                        <img src={property.images[0]} alt={property.title} className="w-16 h-16 object-cover rounded-lg" />
                                    </td>
                                    <td className="p-4 font-medium text-gray-800">{property.title}</td>
                                    <td className="p-4 text-gray-600">{property.price}</td>
                                    <td className="p-4 text-gray-600">{property.location}</td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => handleEdit(property)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition">
                                                <Edit className="w-5 h-5" />
                                            </button>
                                            <button onClick={() => handleDelete(property.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition">
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {properties.length === 0 && (
                        <div className="text-center py-10 text-gray-500">No properties found. Add one to get started.</div>
                    )}
                </div>
            </div>

            {/* Modal Placeholder - In a real app this would be a full form */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl p-8 max-w-lg w-full shadow-2xl animate-fade-in-up">
                        <h2 className="text-2xl font-bold mb-6">{editingProperty ? 'Edit Property' : 'Add New Property'}</h2>
                        <p className="text-gray-600 mb-6">
                            This is a demo dashboard. In a full production app, this form would connect to your backend database to update listings in real-time.
                        </p>
                        <div className="space-y-4">
                            <input type="text" placeholder="Property Title" className="w-full p-3 border border-gray-200 rounded-lg" defaultValue={editingProperty?.title} />
                            <input type="text" placeholder="Price" className="w-full p-3 border border-gray-200 rounded-lg" defaultValue={editingProperty?.price} />
                        </div>
                        <div className="flex justify-end gap-4 mt-8">
                            <button onClick={() => setIsModalOpen(false)} className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition">Cancel</button>
                            <button onClick={() => setIsModalOpen(false)} className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 transition">Save Changes</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManageProperties;
