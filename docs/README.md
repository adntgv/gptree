# GPTree Documentation

Welcome to the GPTree documentation! This directory contains comprehensive documentation for the GPTree application, a tree-structured chat application built with Next.js that allows users to have branching conversations with OpenAI's GPT.

## Documentation Overview

### For New Developers

- [**Quick Setup Guide**](./QUICK_SETUP.md) - Get started quickly with installation and basic configuration
- [**Project Documentation**](./PROJECT_DOCUMENTATION.md) - Comprehensive overview of the project structure and features
- [**Developer Guide**](./DEVELOPER_GUIDE.md) - Detailed guide for developers who want to extend the application

### Technical References

- [**Code Architecture**](./CODE_ARCHITECTURE.md) - Detailed explanation of the code structure and component interactions

## Project Overview

GPTree is a branchable, tree-structured chat application that allows you to:

- Create multiple parallel conversations with GPT
- Branch any conversation to explore alternative directions
- Fork from any message to start a new conversation thread
- View auto-generated summaries of conversations
- Navigate through a hierarchical tree of related discussions

## Key Features

- **Tree-Structured Conversations**: Create, branch, and fork conversations
- **Real-time Updates**: Socket.IO integration for immediate responses
- **Thread Summaries**: Auto-generated summaries of conversation threads
- **Offline Capability**: JSON file-based storage for persistence
- **Responsive UI**: Modern interface built with Tailwind CSS

## Getting Started

To get started with the project, refer to the [Quick Setup Guide](./QUICK_SETUP.md).

## Contributing

If you're interested in contributing to the project, please refer to the [Developer Guide](./DEVELOPER_GUIDE.md) for detailed information about the codebase and how to extend it.

## Architecture

For a detailed understanding of the application architecture, refer to the [Code Architecture](./CODE_ARCHITECTURE.md) document.

## Tech Stack

- **Next.js**: Framework for server-rendered React applications
- **React**: UI library
- **Zustand**: State management
- **Socket.IO**: Real-time communication
- **LowDB**: JSON file-based database
- **OpenAI API**: AI chat integration
- **Tailwind CSS**: Utility-first CSS framework 