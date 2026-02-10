import { useParams, Link } from 'react-router-dom';
import { properties } from '../data/properties';
import { MapPin, ArrowLeft, Heart, Share, Star, ShieldCheck, DoorOpen, Calendar } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const PropertyDetail = () => {
    const { id } = useParams();
    // Handle both int and string ids (from my duplicate demo hack)
    const propId = id.toString().split('-')[0];
    const property = properties.find((p) => p.id === parseInt(propId));

    if (!property) {
        return <div className="text-center py-20 text-xl font-bold">Property not found!</div>;
    }

    return (
        <div className="min-h-screen bg-white">
            <Navbar />

            <main className="container mx-auto px-6 pt-24 pb-12">
                {/* Header: Title and Actions */}
                <div className="mb-6">
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{property.title}</h1>
                    <div className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-2 text-gray-800 font-medium underline">
                            <Star className="w-4 h-4 fill-black" />
                            <span>5.0 · </span>
                            <span className="font-semibold underline">7 reviews</span>
                            <span>·</span>
                            <span className="text-gray-500 no-underline">{property.location}</span>
                        </div>
                        <div className="flex gap-4">
                            <button className="flex items-center gap-2 hover:bg-gray-100 px-3 py-1.5 rounded-lg underline font-semibold text-sm">
                                <Share className="w-4 h-4" /> Share
                            </button>
                            <button className="flex items-center gap-2 hover:bg-gray-100 px-3 py-1.5 rounded-lg underline font-semibold text-sm">
                                <Heart className="w-4 h-4" /> Save
                            </button>
                        </div>
                    </div>
                </div>

                {/* Image Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 grid-rows-2 gap-2 h-[400px] md:h-[500px] rounded-2xl overflow-hidden mb-12 relative">
                    <div className="md:col-span-2 md:row-span-2 relative group cursor-pointer">
                        <img src={property.images[0]} alt="Main" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition"></div>
                    </div>
                    <div className="hidden md:block relative group cursor-pointer">
                        <img src={property.images[1] || property.images[0]} alt="Sub 1" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition"></div>
                    </div>
                    <div className="hidden md:block relative group cursor-pointer">
                        <img src={property.images[0]} alt="Sub 2" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition"></div>
                    </div>
                    <div className="hidden md:block relative group cursor-pointer">
                        <img src={property.images[1] || property.images[0]} alt="Sub 3" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition"></div>
                    </div>
                    <div className="hidden md:block relative group cursor-pointer">
                        <img src={property.images[0]} alt="Sub 4" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition"></div>
                        <button className="absolute bottom-4 right-4 bg-white border border-gray-800 px-4 py-1.5 rounded-lg text-sm font-semibold shadow-sm hover:bg-gray-100">
                            Show all photos
                        </button>
                    </div>
                </div>

                {/* Main Content Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">

                    {/* Left Column: Details */}
                    <div className="lg:col-span-2">
                        <div className="border-b border-gray-200 pb-8 mb-8">
                            <h2 className="text-2xl font-bold mb-1">Entire home hosted by Agent Smith</h2>
                            <p className="text-gray-600 mb-0">
                                {property.rooms} guests · {property.rooms} bedrooms · {property.rooms * 2} beds · {property.bathrooms} baths
                            </p>
                        </div>

                        {/* Features */}
                        <div className="border-b border-gray-200 pb-8 mb-8 space-y-6">
                            <div className="flex gap-4">
                                <DoorOpen className="w-8 h-8 text-gray-800" />
                                <div>
                                    <h3 className="font-bold text-gray-800">Self check-in</h3>
                                    <p className="text-gray-500 text-sm">Check yourself in with the keynote.</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <ShieldCheck className="w-8 h-8 text-gray-800" />
                                <div>
                                    <h3 className="font-bold text-gray-800">Agent Smith is a Superhost</h3>
                                    <p className="text-gray-500 text-sm">Superhosts are experienced, highly rated hosts.</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <Calendar className="w-8 h-8 text-gray-800" />
                                <div>
                                    <h3 className="font-bold text-gray-800">Free cancellation for 48 hours.</h3>
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        <div className="border-b border-gray-200 pb-8 mb-8">
                            <p className="text-gray-800 leading-relaxed text-base whitespace-pre-line">
                                {property.description}
                                <br /><br />
                                Enjoy a stylish experience at this centrally-located place.
                                The space is designed with modern aesthetics and maximum comfort in mind.
                            </p>
                        </div>

                        {/* Map Section */}
                        <div className="pt-4">
                            <h2 className="text-2xl font-bold mb-4">Where you'll be</h2>
                            <div className="h-96 w-full rounded-xl overflow-hidden bg-gray-100">
                                <iframe
                                    width="100%"
                                    height="100%"
                                    frameBorder="0"
                                    style={{ border: 0 }}
                                    src={`https://maps.google.com/maps?q=${property.coordinates.lat},${property.coordinates.lng}&hl=en&z=14&output=embed`}
                                    allowFullScreen
                                ></iframe>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Sticky Reservation Card */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-32 bg-white rounded-xl shadow-card border border-gray-200 p-6">
                            <div className="flex justify-between items-end mb-6">
                                <div>
                                    <span className="text-2xl font-bold text-gray-900">{property.price}</span>
                                </div>
                                <div className="flex items-center gap-1 text-sm font-semibold">
                                    <Star className="w-3 h-3 fill-black" />
                                    <span>5.0</span>
                                    <span className="text-gray-400 font-light"> · </span>
                                    <span className="text-gray-500 underline font-light">7 reviews</span>
                                </div>
                            </div>

                            <div className="border border-gray-400 rounded-lg overflow-hidden mb-4">
                                <div className="grid grid-cols-2 border-b border-gray-400">
                                    <div className="p-3 border-r border-gray-400">
                                        <label className="block text-[10px] font-bold uppercase text-gray-800">Check-in</label>
                                        <div className="text-sm">Add date</div>
                                    </div>
                                    <div className="p-3">
                                        <label className="block text-[10px] font-bold uppercase text-gray-800">Checkout</label>
                                        <div className="text-sm">Add date</div>
                                    </div>
                                </div>
                                <div className="p-3">
                                    <label className="block text-[10px] font-bold uppercase text-gray-800">Guests</label>
                                    <div className="text-sm">1 guest</div>
                                </div>
                            </div>

                            <button className="w-full bg-primary text-white font-bold text-lg py-3 rounded-lg hover:bg-[#E00B41] transition mb-4">
                                Reserve
                            </button>

                            <div className="text-center text-sm text-gray-500 mb-6">You won't be charged yet</div>

                            <div className="space-y-3 text-gray-700">
                                <div className="flex justify-between underline">
                                    <span>$1,000 x 5 nights</span>
                                    <span>$5,000</span>
                                </div>
                                <div className="flex justify-between underline">
                                    <span>Cleaning fee</span>
                                    <span>$250</span>
                                </div>
                                <div className="flex justify-between underline">
                                    <span>Service fee</span>
                                    <span>$800</span>
                                </div>
                            </div>

                            <div className="border-t border-gray-200 mt-6 pt-6 flex justify-between font-bold text-lg">
                                <span>Total before taxes</span>
                                <span>$6,050</span>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default PropertyDetail;
