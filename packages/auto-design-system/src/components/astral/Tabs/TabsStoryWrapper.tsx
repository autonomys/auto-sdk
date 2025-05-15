import React, { ReactElement, ReactNode, useState } from 'react'

// Simplified TabTitle component for stories
type TabTitleProps = {
  title: string
  id?: string
  index: number
  isSelected: boolean
  setSelectedTab: (index: number) => void
  pillStyle: string
  activePillStyle: string
  onClick?: React.MouseEventHandler<HTMLButtonElement>
}

const TabTitle: React.FC<TabTitleProps> = ({
  title,
  setSelectedTab,
  isSelected,
  index,
  onClick,
  pillStyle,
  activePillStyle,
}) => {
  const handleOnClick = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    setSelectedTab(index)
    if (onClick) onClick(e)
  }

  return (
    <li className='-mb-px w-full text-center last:mr-0 lg:w-auto'>
      <button
        className={`block w-full rounded-full px-[13.8px] py-3 text-xs font-semibold leading-normal lg:w-auto ${
          isSelected ? activePillStyle : pillStyle
        }`}
        onClick={handleOnClick}
      >
        {title}
      </button>
    </li>
  )
}

// Simplified Tab component for stories
type TabProps = {
  title: string
  id?: string
  children?: ReactNode
  onClick?: React.MouseEventHandler<HTMLButtonElement>
}

export const TabSimple: React.FC<TabProps> = ({ children, id }) => {
  return <div id={id}>{children}</div>
}

// Simplified TabContent component for stories
type TabContentProps = {
  children: ReactElement[] | ReactElement
  selectedTab: number
}

const TabContent: React.FC<TabContentProps> = ({ children, selectedTab }) => {
  if (!Array.isArray(children)) {
    return <div>{children}</div>
  }
  return <div>{children[selectedTab]}</div>
}

// Simplified Tabs component for stories
type TabsProps = {
  children: ReactElement[] | ReactElement
  initialIndex?: number
  pillStyle?: string
  activePillStyle?: string
  tabStyle?: string
  tabTitleStyle?: string
}

export const TabsStoryWrapper: React.FC<TabsProps> = ({
  children,
  initialIndex = 0,
  tabStyle = 'bg-white border border-slate-100 shadow rounded-lg p-4',
  tabTitleStyle = '',
  pillStyle = 'text-gray-600 bg-white dark:bg-transparent dark:text-white',
  activePillStyle = 'text-white bg-grayDarker dark:bg-blueAccent',
}) => {
  const [selectedTab, setSelectedTab] = useState<number>(initialIndex)

  return (
    <div className={`flex flex-wrap ${tabStyle}`}>
      <div className='w-full'>
        <ul
          className={`flex w-full list-none flex-row flex-wrap pb-4 pt-3 ${tabTitleStyle}`}
          role='tablist'
        >
          {Array.isArray(children) ? (
            children.map((item, index) => (
              <TabTitle
                id={item.props.id}
                key={index}
                title={item.props.title}
                onClick={item.props.onClick}
                index={index}
                isSelected={selectedTab === index}
                setSelectedTab={setSelectedTab}
                pillStyle={pillStyle}
                activePillStyle={activePillStyle}
              />
            ))
          ) : (
            <TabTitle
              id={children.props.id}
              title={children.props.title}
              onClick={children.props.onClick}
              index={0}
              isSelected={selectedTab === 0}
              setSelectedTab={setSelectedTab}
              pillStyle={pillStyle}
              activePillStyle={activePillStyle}
            />
          )}
        </ul>
        <TabContent selectedTab={selectedTab}>{children}</TabContent>
      </div>
    </div>
  )
}
