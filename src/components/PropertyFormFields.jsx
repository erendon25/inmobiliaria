import React from 'react';
import { DollarSign } from 'lucide-react';

const PropertyFormFields = ({ formData, setFormData }) => {
    const { category, type } = formData;

    const Input = ({ label, field, type = "text", placeholder = "" }) => (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
            <input
                type={type}
                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#fc7f51] outline-none"
                placeholder={placeholder}
                value={formData[field]}
                onChange={e => setFormData({ ...formData, [field]: e.target.value })}
            />
        </div>
    );

    const Select = ({ label, field, options }) => (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
            <select
                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#fc7f51] outline-none bg-white"
                value={formData[field]}
                onChange={e => setFormData({ ...formData, [field]: e.target.value })}
            >
                {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
        </div>
    );

    const Checkbox = ({ label, field, icon = null }) => (
        <label className="flex items-center cursor-pointer gap-2">
            <input
                type="checkbox"
                className="w-4 h-4 accent-[#fc7f51]"
                checked={!!formData[field]}
                onChange={e => setFormData({ ...formData, [field]: e.target.checked })}
            />
            <span className="text-sm font-medium text-gray-600 flex items-center gap-1">
                {icon} {label}
            </span>
        </label>
    );

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
                {/* Size & Room Fields mapping based on category/type */}
                {category === 'Casa' && (
                    <>
                        <Input label="Área de Terreno (m²)" field="areaTerreno" type="number" />
                        <Input label="Área Construida (m²)" field="areaConstruida" type="number" />
                    </>
                )}
                {(category === 'Departamento' || category === 'Pre venta') && (
                    <>
                        {type === 'venta' && <Input label="Área Construida (m²)" field="areaConstruida" type="number" />}
                        {type === 'venta' && <Input label="Área Libre (m²)" field="areaLibre" type="number" />}
                        {type === 'alquiler' && <Input label="Área Construida (m²)" field="areaConstruida" type="number" />}
                        {type === 'alquiler' && <Input label="Área Libre (m²)" field="areaLibre" type="number" />}
                        <Select label="¿Es Dúplex?" field="isDuplex" options={[{ label: 'No', value: 'no' }, { label: 'Sí', value: 'si' }]} />
                    </>
                )}
                {category === 'Terreno Urbano' && (
                    <>
                        <Input label="Metraje Total (m²)" field="areaTerreno" type="number" />
                        <Input label="Área Frentera (m)" field="areaFrente" type="number" />
                        <Input label="Área Fondo (m)" field="areaFondo" type="number" />
                        {type === 'venta' && <Input label="Pisos Construibles" field="buildableFloors" type="number" />}
                    </>
                )}
                {category === 'Casa de playa' && (
                    <>
                        <Input label="Área Construida (m²)" field="areaConstruida" type="number" />
                        <Input label="Área de Terreno (m²)" field="areaTerreno" type="number" />
                    </>
                )}
                {category === 'Terreno Comercial' && (
                    <>
                        <Input label="Área Frentera (m)" field="areaFrente" type="number" />
                        <Input label="Área Fondo (m)" field="areaFondo" type="number" />
                    </>
                )}
                {category === 'Local Comercial' && (
                    <>
                        <Input label="Área Construida (m²)" field="areaConstruida" type="number" />
                        {type === 'venta' && <Input label="Área de Terreno (m²)" field="areaTerreno" type="number" />}
                    </>
                )}
                {category === 'Terreno de playa' && (
                    <Input label="Área de Terreno (m²)" field="areaTerreno" type="number" />
                )}

                {/* Common room details depending on category */}
                {(category === 'Casa' || category === 'Departamento' || category === 'Pre venta' || category === 'Casa de playa') && (
                    <>
                        <Input label="Habitaciones" field="bedrooms" type="number" />
                        <Input label="Baños" field="bathrooms" type="number" />
                        {(category === 'Casa' || category === 'Casa de playa') && <Input label="Pisos" field="floors" type="number" />}
                        {(category === 'Departamento' || category === 'Pre venta') && <Input label="Nivel/Piso" field="floorLevel" type="text" placeholder="Ej: 5to" />}
                    </>
                )}
                {category === 'Local Comercial' && (
                    <>
                        <Input label="Baños" field="bathrooms" type="number" />
                        <Input label="Ambientes" field="environments" type="number" />
                    </>
                )}
                {formData.parking && (
                    <Input label="Capacidad Cochera (autos)" field="garageCapacity" type="number" />
                )}
            </div>

            {/* Additional Characteristics */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider">Características Adicionales</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {/* Casa */}
                    {category === 'Casa' && (
                        <>
                            <Checkbox label="Seguridad 24/7" field="security" />
                            {type === 'venta' && <Checkbox label="Crédito Hipotecario" field="mortgageEligible" icon={<DollarSign className="w-3 h-3" />} />}
                            <Checkbox label="Patio" field="patio" />
                            <Checkbox label="Cochera" field="parking" />
                            <Checkbox label="Piscina" field="pool" />
                            {type === 'alquiler' && (
                                <>
                                    <Checkbox label="Amoblado" field="furnished" />
                                    <Checkbox label="Es de uso comercial" field="commercialUse" />
                                    <Checkbox label="Acepta mascotas" field="petsAllowed" />
                                </>
                            )}
                        </>
                    )}

                    {/* Departamento & Pre venta */}
                    {(category === 'Departamento' || category === 'Pre venta') && (
                        <>
                            {type === 'venta' && <Checkbox label="Paga Alcabala" field="alcabala" />}
                            <Checkbox label="Cochera" field="parking" />
                            <Checkbox label="Ascensor" field="elevator" />
                            <Checkbox label="Ascensor para discapacitados" field="wheelchairElevator" />
                            <Checkbox label="Amoblado" field="furnished" />
                            <Checkbox label="Seguridad 24/7" field="security" />
                            <Checkbox label="Rampa para discapacitados" field="ramp" />
                            {type === 'venta' && <Checkbox label="Crédito Hipotecario" field="mortgageEligible" icon={<DollarSign className="w-3 h-3" />} />}
                            <Checkbox label="Áreas comunes" field="commonAreas" />
                            <Checkbox label="Patio" field="patio" />
                            <Checkbox label="Terma solar o gas" field="solarHeater" />
                            {type === 'alquiler' && (
                                <>
                                    <Checkbox label="Agua independiente" field="independentWater" />
                                    <Checkbox label="Luz independiente" field="independentLight" />
                                    <Checkbox label="Acepta mascotas" field="petsAllowed" />
                                </>
                            )}
                        </>
                    )}

                    {/* Terreno Urbano */}
                    {category === 'Terreno Urbano' && (
                        <>
                            {type === 'venta' && (
                                <>
                                    <div className="col-span-full mb-2">
                                        <label className="text-sm font-medium text-gray-700 block mb-1">Dentro de residencial</label>
                                        <select className="w-full px-2 py-1 rounded border border-gray-200" value={formData.inPrivateResidential} onChange={e => setFormData({ ...formData, inPrivateResidential: e.target.value })}>
                                            <option value="no">Fuera de residencial</option>
                                            <option value="si">Privada</option>
                                        </select>
                                    </div>
                                    <Checkbox label="Seguridad 24/7" field="security" />
                                    <Checkbox label="Crédito Hipotecario" field="mortgageEligible" icon={<DollarSign className="w-3 h-3" />} />
                                </>
                            )}
                            <Checkbox label="Cercado" field="fenced" />
                            {type === 'alquiler' && <Checkbox label="Se puede usar como almacén" field="warehouseUse" />}
                        </>
                    )}

                    {/* Terreno Rustico */}
                    {category === 'Terreno Rustico' && (
                        <>
                            <div className="col-span-full mb-2">
                                <label className="text-sm font-medium text-gray-700 block mb-1">Cambio de Uso</label>
                                <select className="w-full px-2 py-1 rounded border border-gray-200" value={formData.changeOfUse} onChange={e => setFormData({ ...formData, changeOfUse: e.target.value })}>
                                    <option value="no">No</option>
                                    <option value="si">Sí</option>
                                </select>
                            </div>
                        </>
                    )}

                    {/* Casa de playa */}
                    {category === 'Casa de playa' && (
                        <>
                            {type === 'venta' && <Checkbox label="Crédito Hipotecario" field="mortgageEligible" icon={<DollarSign className="w-3 h-3" />} />}
                            <Checkbox label="Piscina" field="pool" />
                            <Checkbox label="Cochera" field="parking" />
                            <Checkbox label="Condominio privado" field="condominium" />
                            <div className="col-span-full my-1">
                                <label className="text-sm font-medium text-gray-700 block mb-1">Vista</label>
                                <select className="w-full px-2 py-1 rounded border border-gray-200" value={formData.seaView} onChange={e => setFormData({ ...formData, seaView: e.target.value })}>
                                    <option value="interior">Interior residencial</option>
                                    <option value="mar">Al mar</option>
                                </select>
                            </div>
                            <Checkbox label="Terraza" field="terrace" />
                            {type === 'venta' && <Checkbox label="Amoblado" field="furnished" />}
                            {type === 'alquiler' && (
                                <>
                                    <Checkbox label="Acepta mascotas" field="petsAllowed" />
                                    <Checkbox label="Seguridad" field="security" />
                                </>
                            )}
                        </>
                    )}

                    {/* Terreno Comercial */}
                    {category === 'Terreno Comercial' && (
                        <>
                            <Checkbox label="En avenida principal" field="mainAvenue" />
                            {type === 'alquiler' && (
                                <>
                                    <Checkbox label="Luz trifásica" field="threePhaseLight" />
                                    <Checkbox label="Cercado" field="fenced" />
                                    <Checkbox label="Agua potable" field="potableWater" />
                                </>
                            )}
                        </>
                    )}

                    {/* Local Comercial */}
                    {category === 'Local Comercial' && (
                        <>
                            <Checkbox label="Puerta a la calle" field="streetDoor" />
                            <Checkbox label="Cochera" field="parking" />
                            <Checkbox label="Dentro de un centro comercial" field="mall" />
                            {type === 'alquiler' && (
                                <>
                                    <Checkbox label="Agua independiente" field="independentWater" />
                                    <Checkbox label="Luz independiente" field="independentLight" />
                                </>
                            )}
                        </>
                    )}

                    {/* Terreno de playa */}
                    {category === 'Terreno de playa' && (
                        <>
                            <Checkbox label="Dentro de condominio" field="condominium" />
                            <Checkbox label="Áreas comunes" field="commonAreas" />
                            <Checkbox label="Piscina" field="pool" />
                            <Checkbox label="Cuenta con Luz" field="independentLight" />
                            <Checkbox label="Cuenta con Agua" field="potableWater" />
                            <Checkbox label="Cuenta con Desagüe" field="drainage" />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PropertyFormFields;
