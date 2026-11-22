project(NitroPoseDetector)
cmake_minimum_required(VERSION 3.9.0)

set (PACKAGE_NAME NitroPoseDetector)
set (CMAKE_VERBOSE_MAKEFILE ON)
set (CMAKE_CXX_STANDARD 20)

add_library(${PACKAGE_NAME} SHARED
        src/main/cpp/cpp-adapter.cpp
)

include(${CMAKE_SOURCE_DIR}/../nitrogen/generated/android/NitroPoseDetector+autolinking.cmake)

include_directories("src/main/cpp")

find_library(LOG_LIB log)
# The spec takes a VisionCamera `Frame`, so we compile against its C++ headers.
find_package(react-native-vision-camera REQUIRED)

target_link_libraries(
        ${PACKAGE_NAME}
        ${LOG_LIB}
        android
        react-native-vision-camera::VisionCamera
)
