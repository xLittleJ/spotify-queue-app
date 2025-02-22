'use client';

import {
  banUser,
  getBanned,
  unbanUser,
  updateBannedUser,
} from '@/actions/banActions';
import { toggleListener, toggleQueue } from '@/actions/toggleActions';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { toast } from 'react-toastify';

export default function Management() {
  const [loading, setLoading] = useState(false);
  const [banned, setBanned] = useState<any[]>([]);

  const router = useRouter();

  useEffect(() => {
    const fetchBanned = async () => {
      const data = await getBanned();
      if (data.success) {
        setBanned(data.bannedDiscordIds);
      }
    };
    fetchBanned();
  }, []);

  const closeKeyboard = () => {
    const inputElement = document.activeElement as HTMLInputElement;
    if (inputElement) {
      inputElement.blur();
    }
  };

  const handleBan = async (event: FormEvent<HTMLFormElement>) => {
    closeKeyboard();
    event.preventDefault();

    const toastId = toast.loading('Banning user...', {
      theme: 'dark',
      closeOnClick: true,
    });
    try {
      setLoading(true);
      const form = event.currentTarget;
      const formData = new FormData(form);
      const data = await banUser(formData);
      console.log(data);
      if (data.success) {
        form.reset();
        setBanned(data.bannedDiscordIds);
        toast.update(toastId, {
          render: `${
            data.bannedDiscordIds[data.bannedDiscordIds.length - 1].global_name
          } has been banned`,
          type: 'success',
          isLoading: false,
          autoClose: 2000,
        });
      } else {
        toast.update(toastId, {
          render: data.message,
          type: 'error',
          isLoading: false,
          autoClose: 2000,
        });
      }
    } catch (error) {
      router.refresh();
      toast.update(toastId, {
        render: 'A connection error has occurred',
        type: 'error',
        isLoading: false,
        autoClose: 2000,
      });
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className='mt-6 flex flex-col items-center justify-center'>
      <h3 className='text-2xl font-bold text-white text-center mt-4'>
        Management
      </h3>
      <div className='flex items-center justify-center w-screen gap-4'>
        <div className='flex items-center mt-4'>
          <button
            disabled={loading}
            onClick={async () => {
              const toastId = toast.loading('Toggling Queue Submissions...', {
                theme: 'dark',
                closeOnClick: true,
              });
              try {
                setLoading(true);
                const data = await toggleQueue();
                if (data.success) {
                  toast.update(toastId, {
                    render: `Queue has been ${
                      data.queueEnabled ? 'enabled' : 'disabled'
                    }`,
                    type: 'success',
                    isLoading: false,
                    autoClose: 2000,
                  });
                } else {
                  toast.update(toastId, {
                    render: data.message,
                    type: 'error',
                    isLoading: false,
                    autoClose: 2000,
                  });
                }
              } catch (error) {
                router.refresh();
                toast.update(toastId, {
                  render: 'A connection error has occurred',
                  type: 'error',
                  isLoading: false,
                  autoClose: 2000,
                });
              } finally {
                setLoading(false);
              }
            }}
            className={`px-4 py-2 rounded-md transition bg-blue-500 text-white ${
              loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'
            }`}
          >
            Toggle Queue
          </button>
        </div>
        <div className='flex items-center mt-4'>
          <button
            disabled={loading}
            onClick={async () => {
              const toastId = toast.loading('Toggling Spotify Listener...', {
                theme: 'dark',
                closeOnClick: true,
              });
              try {
                setLoading(true);
                const data = await toggleListener();
                if (data.success) {
                  toast.update(toastId, {
                    render: `Listener has been ${
                      data.listenerEnabled ? 'enabled' : 'disabled'
                    }`,
                    type: 'success',
                    isLoading: false,
                    autoClose: 2000,
                  });
                } else {
                  toast.update(toastId, {
                    render: data.message,
                    type: 'error',
                    isLoading: false,
                    autoClose: 2000,
                  });
                }
              } catch (error) {
                router.refresh();
                toast.update(toastId, {
                  render: 'A connection error has occurred',
                  type: 'error',
                  isLoading: false,
                  autoClose: 2000,
                });
              } finally {
                setLoading(false);
              }
            }}
            className={`px-4 py-2 rounded-md transition bg-orange-500 text-white ${
              loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-orange-600'
            }`}
          >
            Toggle Listener
          </button>
        </div>
      </div>
      <div className='mt-4'>
        <h3 className='text-xl font-bold text-white text-center mb-2'>
          Banned Users
        </h3>
        <div className='queue-box border border-white rounded-md p-3 overflow-y-scroll max-h-[200px]'>
          {banned.length > 0 ? (
            <ul className='list-disc pl-5'>
              {banned.map((person) => (
                <li
                  key={person.id}
                  className='flex flex-col md:flex-row items-center justify-between mt-2'
                >
                  <span className='text-[#e9e9e9] flex items-center mb-2 md:mb-0'>
                    {person.avatar && (
                      <img
                        src={person.avatar}
                        alt={person.username}
                        className='w-6 h-6 rounded-full mr-2'
                      />
                    )}
                    {person.global_name} ({person.username}) ({person.id})
                    (Reason: {person.reason || 'none'})
                  </span>
                  <div className='flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2'>
                    <button
                      disabled={loading}
                      onClick={async () => {
                        const toastId = toast.loading(
                          `Unbanning ${person.global_name}...`,
                          {
                            theme: 'dark',
                            closeOnClick: true,
                          },
                        );
                        try {
                          setLoading(true);
                          const data = await unbanUser(person.id);
                          if (data.success) {
                            setBanned(data.bannedDiscordIds);
                            toast.update(toastId, {
                              render: `Unbanned ${person.global_name}`,
                              type: 'success',
                              isLoading: false,
                              autoClose: 2000,
                            });
                          } else {
                            toast.update(toastId, {
                              render: data.message,
                              type: 'error',
                              isLoading: false,
                              autoClose: 2000,
                            });
                          }
                        } catch (error) {
                          router.refresh();
                          toast.update(toastId, {
                            render: 'A connection error has occurred',
                            type: 'error',
                            isLoading: false,
                            autoClose: 2000,
                          });
                        } finally {
                          setLoading(false);
                        }
                      }}
                      className={`px-2 py-1 rounded-md text-white bg-red-500 ${
                        loading
                          ? 'opacity-50 cursor-not-allowed'
                          : 'hover:bg-red-600'
                      }`}
                    >
                      Unban
                    </button>
                    <button
                      onClick={async () => {
                        const toastId = toast.loading(
                          `Updating ${person.global_name}...`,
                          {
                            theme: 'dark',
                            closeOnClick: true,
                          },
                        );
                        try {
                          setLoading(true);
                          const data = await updateBannedUser(person.id);
                          if (data.success) {
                            setBanned(data.bannedDiscordIds);
                            toast.update(toastId, {
                              render: `Updated ${person.global_name}`,
                              type: 'success',
                              isLoading: false,
                              autoClose: 2000,
                            });
                          } else {
                            toast.update(toastId, {
                              render: data.message,
                              type: 'error',
                              isLoading: false,
                              autoClose: 2000,
                            });
                          }
                        } catch (error) {
                          router.refresh();
                          toast.update(toastId, {
                            render: 'A connection error has occurred',
                            type: 'error',
                            isLoading: false,
                            autoClose: 2000,
                          });
                        } finally {
                          setLoading(false);
                        }
                      }}
                      className={`px-2 py-1 rounded-md text-white bg-blue-500 ${
                        loading
                          ? 'opacity-50 cursor-not-allowed'
                          : 'hover:bg-blue-600'
                      }`}
                      disabled={loading}
                    >
                      Update
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className='text-sm text-center text-[#e9e9e9]'>
              No banned users
            </p>
          )}
        </div>
        <form onSubmit={handleBan}>
          <div className='mt-4 flex flex-col gap-2'>
            <input
              type='text'
              name='id'
              pattern='^[0-9]{17,20}$'
              onInput={(e) =>
                (e.target as HTMLInputElement).setCustomValidity('')
              }
              onInvalid={(e) =>
                (e.target as HTMLInputElement).setCustomValidity(
                  'Must be a valid Discord ID',
                )
              }
              placeholder='Enter Discord ID to ban'
              className='border p-2 w-full rounded-md border-white text-white'
              required
            />
            <textarea
              name='reason'
              placeholder='Reason for ban (optional)'
              className='border p-2 w-full rounded-md border-white text-white'
            />
          </div>
          <button
            type='submit'
            disabled={loading}
            className={`mt-2 px-4 py-2 rounded-md text-white bg-red-500 ${
              loading ? 'opacity-50 cursor-not-allowed' : ' hover:bg-red-600'
            }`}
          >
            Ban
          </button>
        </form>
      </div>
    </div>
  );
}
