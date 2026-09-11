import React, { useEffect, useState } from "react";
import type { Address } from "../types";
import { MapPinIcon, PlusIcon } from "lucide-react";
import Loading from "../components/Loading";
import AddressCard from "../components/AddressCard.js";
import AddressForm from "../components/AddressForm.js";
import { useAuth } from "../context/AuthContext.js";
import api from "../config/api.js";
import { toast } from "react-hot-toast";
import { isAxiosError } from "axios";

const Addresses = () => {

  const { updateUser } = useAuth();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    label: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    isDefault: false
  });

  const resetForm = () => {
    setForm({
      label: "",
      address: "",
      city: "",
      state: "",
      zip: "",
      isDefault: false,
    });
    setShowForm(false);
    setEditingId(null);
  }

  const getLocation = (retries = 3): Promise<{ lat: number, lng: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation not supported"))
        return;
      }
      const attempt = () => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            })
          },
          (error) => {
            if (retries > 0) {
              retries--;
              setTimeout(attempt, 1000)
            } else {
              reject(new Error(error.message || "Failed to get location after retries"))
            }
          },
          {
            enableHighAccuracy: false,
            timeout: 15000,
            maximumAge: 60000,
          }
        )
      };
      attempt()
    })
  }

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault()

    try {
      const coords = await getLocation()
      const payload = { ...form, ...coords }

      if (editingId) {
        const { data } = await api.put(`/addresses/${editingId}`, payload);

        setAddresses(data.addresses)
        updateUser({ address: data.addresses })
        toast.success("Address updated!")
      } else {
        const { data } = await api.post(`/addresses`, payload);
        setAddresses(data.addresses)
        updateUser({ address: data.addresses })
        toast.success("Address Added!")
      }
      resetForm()
    } catch (error: unknown) {
      const message = isAxiosError<{ message?: string }>(error)
        ? error?.response?.data?.message :
        error instanceof Error
          ? error.message : undefined;

      toast.error(message || "Failed to update add address")
    }
  }

  const onEditHandler = (add: Address) => {
    setForm({
      label: add.label,
      address: add.address,
      city: add.city,
      state: add.state,
      zip: add.zip,
      isDefault: add.isDefault
    });

    setEditingId(add.id);
    setShowForm(true);
  }

  useEffect(() => {
    const loadAddresses = async () => {
      try {
        const { data } = await api.get("/addresses");
        setAddresses(data.addresses ?? []);
      } catch (error: unknown) {
        if (isAxiosError(error)) {
          console.error("GET /addresses failed:", error.response?.status, error.response?.data);
          toast.error(error.response?.data?.message || "Failed to load addresses");
        } else {
          toast.error("Failed to load addresses");
        }
      } finally {
        setLoading(false);
      }
    };

    loadAddresses();
  }, []);

  return (
    <div className="min-h-screen bg-app-cream">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* page header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-semibold text-app-green">My Addresses</h1>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="px-4 py-2 bg-app-green text-white text-sm font-semibold rounded-xl hover:bg-app-green-light transition-colors flex items-center gap-2">
            <PlusIcon className="size-4" /> Add Address
          </button>
        </div>

        {/* Form Modal */}
        {showForm && <AddressForm resetForm={resetForm} handleSubmit={handleSubmit} form={form} setForm={setForm} editingId={editingId} />}

        {/* Address List */}
        {
          loading ? (
            <Loading />
          ) : addresses.length === 0 ? (
            <div className="text-center py-16">
              <MapPinIcon className="size-16 text-app-border mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-app-green mb-2">No addresses saved</h2>
              <p className="text-sm text-app-text-light">Add an address for faster checkout</p>
            </div>
          ) : (
            <div className="space-y-4">
              {
                addresses.map((address) => (
                  <AddressCard key={address.id} address={address} onEditHandler={onEditHandler} setAddresses={setAddresses} />
                ))
              }
            </div>
          )
        }
      </div>
    </div>
  )
}
export default Addresses
