// app/profile/page.tsx
async function getUser() {
    const res = await fetch("http://localhost:4000/api/profile", { //fetchi hna 
      cache: "no-store", 
    })
    if (!res.ok) {
      throw new Error("Failed to fetch profile")
    }
    return res.json()
  }
  
  export default async function ProfilePage() {
    const user = await getUser();
  
    return (
      <div className="min-h-screen flex flex-col items-center justify-start p-6 bg-gray-100">
        <div className="bg-white rounded-2xl shadow-md p-6 w-full max-w-md">
          {/* Avatar */}
          <div className="flex flex-col items-center">
            {user.avatar && (
              <img
                src={user.avatar}
                alt="Avatar"
                className="w-24 h-24 rounded-full object-cover border-4 border-blue-500"
              />
            )}
            <h1 className="text-2xl font-bold mt-4">
              {user.firstName} {user.lastName}
            </h1>
            {user.nickname && (
              <p className="text-gray-500">@{user.nickname}</p>
            )}
          </div>
  
          {/* Info */}
          <div className="mt-6 space-y-2">
            <p>
              <span className="font-semibold">Email:</span> {user.email}
            </p>
            <p>
              <span className="font-semibold">Date of Birth:</span> {user.dob}
            </p>
            {user.about && (
              <p>
                <span className="font-semibold">About Me:</span> {user.about}
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }
  