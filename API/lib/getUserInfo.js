function getUserInfo (user) {
  console.log('getUserInfo', user)
  return {
    username: user.username,
    name: user.name,
    id: user.id || user._id
  }
}

export default getUserInfo
